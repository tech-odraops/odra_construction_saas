
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Typography } from "@mui/material";
import Input from "../../Components/atoms/Input/Input";
import axiosInstance from "../../utils/axiosInstance";
import projectArtwork from "../../assets/Add New Project (2).png";
import Button from "../../Components/atoms/Button/Button";

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

  const fields = [
    {
      id: "project-title",
      label: t("project.project_title"),
      placeholder: t("project.enter_title"),
      value: title,
      setValue: setTitle,
      type: "text",
    },
    {
      id: "project-description",
      label: t("project.project_description"),
      placeholder: t("project.enter_description"),
      value: description,
      setValue: setDescription,
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
                ({ id, label, placeholder, value, setValue, multiline, type }) => (
                  <Input
                    key={id}
                    id={id}
                    label={label}
                    type={multiline ? "textarea" : type}
                    rows={4}
                    placeholder={placeholder}
                    required
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                  />
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
