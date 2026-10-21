
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Button, Typography } from "@mui/material";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import TextSnippetOutlinedIcon from "@mui/icons-material/TextSnippetOutlined";
import ContractorNavbar from "../../Components/ContractorNavbar";
import Input from "../../Components/atoms/Input/Input";
import axiosInstance from "../../utils/axiosInstance";
import { emailValidator, requiredValidator } from "../../utils/validation";
import projectArtwork from "../../assets/Add New Project (2).png";

export default function AddProject() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (event) => {
    event.preventDefault();

    setLoading(true);

    try {
      const response = await axiosInstance.post("/projects", {
        title,
        description,
      });

      const projectId = response.data?.newProject?._id;

      if (!projectId) {
        toast.error(
          "Project created, but its ID was not returned."
        );
        return;
      }

      toast.success("Project created successfully");

      navigate(`/contractor/project/${projectId}`);
    } catch (err) {
      console.error("Error creating project:", err);

      toast.error(
        err.response?.data?.error || "Error creating project"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (id, setValue) => (event) => {
    setValue(event.target.value);
    setValidationStates((prev) => ({
      ...prev,
      [id]: validateProjectField(id, event.target.value) ? "success" : "error",
    }));
  };

  const handleInputBlur = (id) => (event) => {
    setValidationStates((prev) => ({
      ...prev,
      [id]: validateProjectField(id, event.target.value) ? "success" : "error",
    }));
  };

  const validateProjectField = (id, value) => {
    if (id === "engineer-email") {
      let required = requiredValidator(value);
      setValidationMessages((prev) => ({
        ...prev,
        [id]: required ? undefined : t("validation.required"),
      }));
      if (!required) return required;
      let emailValid = emailValidator(value);
      setValidationMessages((prev) => ({
        ...prev,
        [id]: emailValid ? undefined : t("validation.invalid_email"),
      }));
      if (!emailValid) return emailValid;
      return required && emailValid;
    }
    return requiredValidator(value);
  };

  const fields = [
    {
      id: "project-title",
      label: t("project.project_title"),
      placeholder: t("project.enter_title"),
      value: title,
      setValue: setTitle,
      icon: DescriptionOutlinedIcon,
      type: "text",
    },
    {
      id: "project-description",
      label: t("project.project_description"),
      placeholder: t("project.enter_description"),
      value: description,
      setValue: setDescription,
      icon: TextSnippetOutlinedIcon,
      multiline: true,
    },
  ];

  return (
    <div
      className="add-project-page"
      style={{
        "--project-art": `url("${projectArtwork}")`,
      }}
    >
      <ContractorNavbar />

      <main className="add-project-main">
        <section className="add-project-card">
          <div className="add-project-form-panel">
            <header className="add-project-heading">
              <Typography
                component="h1"
                className="add-project-title"
              >
                Add New <span>Project</span>
              </Typography>

              <Typography
                component="p"
                className="add-project-subtitle"
              >
                Create a project now and add your site team
                from the project details page.
              </Typography>
            </header>

            <form
              className="add-project-form"
              onSubmit={handleSubmit}
            >
              {fields.map(
                ({
                  id,
                  label,
                  placeholder,
                  value,
                  setValue,
                  icon: Icon,
                  multiline,
                  type,
                }) => (
                  <div
                    className="add-project-field"
                    key={id}
                  >
                    <span className="add-project-field-icon">
                      <Icon />
                    </span>

                    <div className="add-project-control">
                      <label htmlFor={id}>{label}</label>

                      {multiline ? (
                        <textarea
                          id={id}
                          rows="4"
                          placeholder={placeholder}
                          required
                          value={value}
                          onChange={(event) =>
                            setValue(event.target.value)
                          }
                        />
                      ) : (
                        <input
                          id={id}
                          type={type}
                          placeholder={placeholder}
                          required
                          value={value}
                          onChange={(event) =>
                            setValue(event.target.value)
                          }
                        />
                      )}
                    </div>
                  </div>
                )
              )}

              <div className="add-project-actions">
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                >
                  {loading
                    ? t("project.creating")
                    : t("project.create_project")}
                </Button>
                <Button
                  type="button"
                  variant="outlined"
                  onClick={() => navigate(-1)}
                  disabled={loading}
                >
                  {t("project.cancel")}
                </Button>
              </div>
            </form>
          </div>
          <aside
            className="add-project-art"
            aria-label="Construction site with a tower crane"
          />
        </section>
      </main>
    </div>
  );
}
