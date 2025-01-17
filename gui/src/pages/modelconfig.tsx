import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import _ from "lodash";
import { useCallback, useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import {
  Input,
  defaultBorderRadius,
  lightGray,
  vscBackground,
} from "../components";
import StyledMarkdownPreview from "../components/markdown/StyledMarkdownPreview";
import ModelCard from "../components/modelSelection/ModelCard";
import { useNavigationListener } from "../hooks/useNavigationListener";
import { setDefaultModel } from "../redux/slices/stateSlice";
import { postToIde } from "../util/ide";
import {
  MODEL_PROVIDER_TAG_COLORS,
  ModelInfo,
  PROVIDER_INFO,
  updatedObj,
} from "../util/modelData";

const GridDiv = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  grid-gap: 2rem;
  padding: 1rem;
  justify-items: center;
  align-items: center;
`;

export const CustomModelButton = styled.div<{ disabled: boolean }>`
  border: 1px solid ${lightGray};
  border-radius: ${defaultBorderRadius};
  padding: 4px 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.5s;

  ${(props) =>
    props.disabled
      ? `
    opacity: 0.5;
    `
      : `
  &:hover {
    border: 1px solid #be1b55;
    background-color: #be1b5522;
    cursor: pointer;
  }
  `}
`;

function ModelConfig() {
  useNavigationListener();
  const formMethods = useForm();
  const { modelName } = useParams();

  const [modelInfo, setModelInfo] = useState<ModelInfo | undefined>(undefined);

  useEffect(() => {
    if (modelName) {
      setModelInfo(PROVIDER_INFO[modelName]);
    }
  }, [modelName]);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const disableModelCards = useCallback(() => {
    return (
      modelInfo?.collectInputFor?.some((d) => {
        if (!d.required) return false;
        const val = formMethods.watch(d.key);
        return (
          typeof val === "undefined" || (typeof val === "string" && val === "")
        );
      }) || false
    );
  }, [modelInfo, formMethods]);

  const handleModelSubmit = (pkg, dimensionChoices) => {
    if (disableModelCards()) return;
    let formParams = {};
    for (const d of modelInfo?.collectInputFor || []) {
      formParams = updatedObj(formParams, {
        [d.key]:
          d.inputType === "text"
            ? formMethods.watch(d.key)
            : parseFloat(formMethods.watch(d.key)),
      });
    }

    const model = {
      ...pkg.params,
      ...modelInfo?.params,
      ..._.merge(
        {},
        ...(pkg.dimensions?.map((dimension, i) => {
          if (!dimensionChoices?.[i]) return {};
          return {
            ...dimension.options[dimensionChoices[i]],
          };
        }) || []),
      ),
      ...formParams,
      provider: modelInfo?.provider,
    };

    postToIde("config/addModel", { model });
    dispatch(setDefaultModel({ title: model.title, force: true }));
    navigate("/");
  };

  const pkg = modelInfo?.packages[0]
  const idx = 0

  // TODO: the <h3>3. Click To Complete </h3> step should not exist. The adding to console.json should happen as soon as the 
  return (
    <FormProvider {...formMethods}>
      <div className="overflow-y-scroll">
        <div
          className="items-center flex m-0 p-0 sticky top-0"
          style={{
            borderBottom: `0.5px solid ${lightGray}`,
            backgroundColor: vscBackground,
            zIndex: 2,
          }}
        >
          <ArrowLeftIcon
            width="1.2em"
            height="1.2em"
            onClick={() => navigate("/models")}
            className="inline-block ml-4 cursor-pointer"
          />
          <h3 className="text-lg font-bold m-2 inline-block">
            Configure Model
          </h3>
        </div>

        <div className="px-2">
          <div style={{ display: "flex", alignItems: "center" }}>
            {window.vscMediaUrl && modelInfo?.icon && (
              <img
                src={`${window.vscMediaUrl}/logos/${modelInfo?.icon}`}
                height="24px"
                style={{ marginRight: "10px" }}
              />
            )}
            <h2>{modelInfo?.title}</h2>
          </div>
          {modelInfo?.tags?.map((tag, idx) => (
            <span
              key={idx}
              style={{
                backgroundColor: `${MODEL_PROVIDER_TAG_COLORS[tag]}55`,
                color: "white",
                padding: "2px 4px",
                borderRadius: defaultBorderRadius,
                marginRight: "4px",
              }}
            >
              {tag}
            </span>
          ))}
          <StyledMarkdownPreview
            className="mt-2"
            source={modelInfo?.longDescription || modelInfo?.description}
          />

          {modelInfo?.provider === "pearai-server" ? (
            <>
              <h3>1. Create Account & Subscribe at <a href="https://trypear.ai" target="_blank" rel="noopener noreferrer">trypear.ai</a></h3>
              <h3>2. Login w/ PearAI via Webapp </h3>
              <CustomModelButton
                className="m-5"
                disabled={false}
                onClick={() =>
                  postToIde(
                    "openUrl",
                    "https://trypear.ai/signin?callback=code-oss://pearai.pearai/auth" // Change to http://localhost:3000 and run pear-landing-page repo to test locally
                  )
                }
              >
                <h3 className="text-center my-2">Login w/ PearAI</h3>
              </CustomModelButton>
              <h3>3. Click To Complete </h3>
              <GridDiv>
                {modelInfo?.packages.map((pkg, idx) => (
                  <ModelCard
                    key={idx}
                    disabled={disableModelCards()}
                    title={"Add PearAI Server"}
                    description={""}
                    tags={pkg.tags}
                    dimensions={pkg.dimensions}
                    onClick={(e, dimensionChoices) =>
                      handleModelSubmit(pkg, dimensionChoices)
                    }
                  />
                ))}
              </GridDiv>
            </>
          ) : (
            <>
              {(modelInfo?.collectInputFor?.filter((d) => d.required).length ||
                0) > 0 && (
                <>
                  <h3 className="mb-2">Enter required parameters</h3>
                  {modelInfo?.collectInputFor
                    ?.filter((d) => d.required)
                    .map((d, idx) => (
                      <div key={idx}>
                        <label htmlFor={d.key}>{d.key}</label>
                        <Input
                          type={d.inputType}
                          id={d.key}
                          className="border-2 border-gray-200 rounded-md p-2 m-2"
                          placeholder={d.key}
                          defaultValue={d.defaultValue}
                          min={d.min}
                          max={d.max}
                          step={d.step}
                          {...formMethods.register(d.key, {
                            required: true,
                          })}
                        />
                      </div>
                    ))}
                </>
              )}

              {(modelInfo?.collectInputFor?.filter((d) => !d.required).length ||
                0) > 0 && (
                <details>
                  <summary className="mb-2">
                    <b>Advanced (optional)</b>
                  </summary>
                  {modelInfo?.collectInputFor?.map((d, idx) => {
                    if (d.required) return null;
                    return (
                      <div key={idx}>
                        <label htmlFor={d.key}>
                          {d.key.split(".").pop()}
                        </label>
                        <Input
                          type={d.inputType}
                          id={d.key}
                          className="border-2 border-gray-200 rounded-md p-2 m-2"
                          placeholder={d.key.split(".").pop()}
                          defaultValue={d.defaultValue}
                          min={d.min}
                          max={d.max}
                          step={d.step}
                          {...formMethods.register(d.key, {
                            required: false,
                          })}
                        />
                      </div>
                    );
                  })}
                </details>
              )}

              <h3 className="mb-2">Select a model preset</h3>
              <GridDiv>
                {modelInfo?.packages.map((pkg, idx) => (
                  <ModelCard
                    key={idx}
                    disabled={disableModelCards()}
                    title={pkg.title}
                    description={pkg.description}
                    tags={pkg.tags}
                    refUrl={pkg.refUrl}
                    icon={pkg.icon || modelInfo.icon}
                    dimensions={pkg.dimensions}
                    onClick={(e, dimensionChoices) =>
                      handleModelSubmit(pkg, dimensionChoices)
                    }
                  />
                ))}
                <div style={{ padding: "8px" }}>
                  <hr
                    style={{
                      color: lightGray,
                      border: `1px solid ${lightGray}`,
                    }}
                  />
                  <p style={{ color: lightGray }}>
                    OR choose from other providers / models by editing
                    config.json.
                  </p>
                  <CustomModelButton
                    disabled={false}
                    onClick={() => postToIde("openConfigJson", undefined)}
                  >
                    <h3 className="text-center my-2">Open config.json</h3>
                  </CustomModelButton>
                </div>
              </GridDiv>
            </>
          )}
        </div>
      </div>
    </FormProvider>
  );
}

export default ModelConfig;
