"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  createForm, updateForm, deleteForm, FormInput,
  createTemplate, updateTemplate, deleteTemplate, TemplateInput,
} from "@/app/(platform)/platform/documents/actions";

interface Form {
  id: string;
  rule_no: string | null;
  rule_heading: string;
  form_no: string | null;
  page_no: string | null;
  parallel_rule_1962: string | null;
  url: string | null;
  sort_order: number;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

interface Props {
  forms: Form[];
  templates: Template[];
  canEdit: boolean;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileTypeBadge(nameOrType: string) {
  const ext = nameOrType.split(".").pop()?.toLowerCase() ?? nameOrType.toLowerCase();
  if (ext === "pdf") return { bg: "bg-red-50", text: "text-red-600", label: "PDF" };
  if (ext === "docx" || ext === "doc") return { bg: "bg-blue-50", text: "text-blue-600", label: ext.toUpperCase() };
  if (ext === "xlsx" || ext === "xls") return { bg: "bg-green-50", text: "text-green-600", label: ext.toUpperCase() };
  return { bg: "bg-gray-100", text: "text-gray-600", label: ext.toUpperCase() };
}

const blankForm: FormInput = { rule_no: "", rule_heading: "", form_no: "", page_no: "", parallel_rule_1962: "", url: "" };
const inp = "w-full px-3 py-2 text-sm border-2 border-[#4A6FA5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]";

export default function PlatformDocumentsClient({ forms, templates, canEdit }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"forms" | "templates">("forms");

  // Form state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingForm, setEditingForm] = useState<Form | null>(null);
  const [formData, setFormData] = useState<FormInput>(blankForm);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingFormId, setDeletingFormId] = useState<string | null>(null);
  const [confirmDeleteForm, setConfirmDeleteForm] = useState<Form | null>(null);

  // Template state
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [tplName, setTplName] = useState("");
  const [tplDesc, setTplDesc] = useState("");
  const [tplFile, setTplFile] = useState<File | null>(null);
  const [tplUploading, setTplUploading] = useState(false);
  const [tplError, setTplError] = useState<string | null>(null);
  const [deletingTplId, setDeletingTplId] = useState<string | null>(null);
  const [confirmDeleteTpl, setConfirmDeleteTpl] = useState<Template | null>(null);

  function openAddForm() {
    setEditingForm(null); setFormData(blankForm); setFormError(null); setShowFormModal(true);
  }
  function openEditForm(f: Form) {
    setEditingForm(f);
    setFormData({ rule_no: f.rule_no ?? "", rule_heading: f.rule_heading, form_no: f.form_no ?? "", page_no: f.page_no ?? "", parallel_rule_1962: f.parallel_rule_1962 ?? "", url: f.url ?? "" });
    setFormError(null); setShowFormModal(true);
  }
  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.rule_heading.trim()) { setFormError("Form description is required."); return; }
    setFormSaving(true); setFormError(null);
    try {
      if (editingForm) { await updateForm(editingForm.id, formData); } else { await createForm(formData); }
      setShowFormModal(false); router.refresh();
    } catch (err) { setFormError(err instanceof Error ? err.message : "Something went wrong."); }
    finally { setFormSaving(false); }
  }
  async function handleDeleteForm(f: Form) {
    setDeletingFormId(f.id);
    try { await deleteForm(f.id); setConfirmDeleteForm(null); router.refresh(); }
    catch (err) { alert(err instanceof Error ? err.message : "Delete failed."); }
    finally { setDeletingFormId(null); }
  }

  function openAddTemplate() {
    setEditingTemplate(null); setTplName(""); setTplDesc(""); setTplFile(null); setTplError(null); setShowTemplateModal(true);
  }
  function openEditTemplate(t: Template) {
    setEditingTemplate(t); setTplName(t.name); setTplDesc(t.description ?? ""); setTplFile(null); setTplError(null); setShowTemplateModal(true);
  }
  async function handleTemplateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tplName.trim()) { setTplError("Template name is required."); return; }
    if (!editingTemplate && !tplFile) { setTplError("Please select a file."); return; }
    setTplUploading(true); setTplError(null);
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, { name: tplName, description: tplDesc || undefined });
      } else {
        const supabase = createClient();
        const path = `templates/${Date.now()}-${tplFile!.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage.from("org-files").upload(path, tplFile!, { upsert: false });
        if (uploadError) throw new Error(uploadError.message);
        const { data: urlData } = supabase.storage.from("org-files").getPublicUrl(uploadData.path);
        const ext = tplFile!.name.split(".").pop()?.toUpperCase();
        await createTemplate({ name: tplName, description: tplDesc || undefined, file_url: urlData.publicUrl, file_type: ext, file_size: tplFile!.size });
      }
      setShowTemplateModal(false); router.refresh();
    } catch (err) { setTplError(err instanceof Error ? err.message : "Upload failed."); }
    finally { setTplUploading(false); }
  }
  async function handleDeleteTemplate(t: Template) {
    setDeletingTplId(t.id);
    try { await deleteTemplate(t.id); setConfirmDeleteTpl(null); router.refresh(); }
    catch (err) { alert(err instanceof Error ? err.message : "Delete failed."); }
    finally { setDeletingTplId(null); }
  }

  const tabs = [
    { key: "forms" as const, label: "Forms", count: forms.length },
    { key: "templates" as const, label: "Templates", count: templates.length },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A2E]">Documents</h1>
        <p className="text-[#6B7280] text-sm mt-0.5">Platform-level forms reference and templates library</p>
      </div>

      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-1 bg-[#F0F2F5] p-1 rounded-lg">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === tab.key ? "bg-white text-[#1A1A2E] shadow-sm" : "text-[#6B7280] hover:text-[#1A1A2E]"}`}>
              {tab.label}
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? "bg-[#EEF2FF] text-[#4A6FA5]" : "bg-white text-[#6B7280]"}`}>{tab.count}</span>
            </button>
          ))}
        </div>
        {canEdit && activeTab === "forms" && (
          <button onClick={openAddForm} className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1E3A5F] hover:bg-[#162d4a] text-white text-sm font-medium rounded-lg transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Add Row
          </button>
        )}
        {canEdit && activeTab === "templates" && (
          <button onClick={openAddTemplate} className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1E3A5F] hover:bg-[#162d4a] text-white text-sm font-medium rounded-lg transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Upload Template
          </button>
        )}
      </div>

      {/* ── FORMS TAB ── */}
      {activeTab === "forms" && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b-2 border-[#B0BDD0] bg-[#D1D9E6]">
            <p className="text-[#1A1A2E] font-semibold text-sm">Forms</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#D1D9E6] border-b-2 border-[#B0BDD0]">
                  <th className="text-center px-4 py-3 font-semibold text-[#1A1A2E] w-24 border-r border-[#E5E7EB]">Rule No.</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#1A1A2E] border-r border-[#E5E7EB]">Form Description</th>
                  <th className="text-center px-4 py-3 font-semibold text-[#1A1A2E] w-24 border-r border-[#E5E7EB]">Form No.</th>
                  <th className="text-center px-4 py-3 font-semibold text-[#1A1A2E] w-24">Section</th>
                  {canEdit && <th className="w-28 px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {forms.length === 0 ? (
                  <tr><td colSpan={canEdit ? 5 : 4} className="px-4 py-12 text-center text-[#6B7280]">No forms added yet.{canEdit && " Click \"Add Row\" to get started."}</td></tr>
                ) : (
                  forms.map((f, i) => (
                    <tr key={f.id} onClick={() => f.url ? window.open(f.url, "_blank") : undefined}
                      className={`border-b border-[#E5E7EB] ${i % 2 === 0 ? "bg-white" : "bg-[#F8F9FA]"} ${f.url ? "cursor-pointer hover:bg-[#EEF2FF]" : "hover:bg-[#F0F4FA]"} transition-colors`}>
                      <td className="px-4 py-3 text-center text-[#1A1A2E] font-medium border-r border-[#E5E7EB]">{f.rule_no || "—"}</td>
                      <td className="px-4 py-3 text-[#1A1A2E] border-r border-[#E5E7EB]"><span className={f.url ? "text-[#4A6FA5] hover:underline" : ""}>{f.rule_heading}</span></td>
                      <td className="px-4 py-3 text-center text-[#6B7280] border-r border-[#E5E7EB]">{f.form_no || "—"}</td>
                      <td className="px-4 py-3 text-center text-[#6B7280]">{f.page_no || "—"}</td>
                      {canEdit && (
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-3">
                            <button onClick={() => openEditForm(f)} className="text-xs font-medium text-[#4A6FA5] hover:text-[#1E3A5F]">Edit</button>
                            <button onClick={() => setConfirmDeleteForm(f)} className="text-xs font-medium text-red-500 hover:text-red-700">Delete</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TEMPLATES TAB ── */}
      {activeTab === "templates" && (
        templates.length === 0 ? (
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-16 text-center">
            <svg className="w-10 h-10 text-[#D1D5DB] mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <p className="text-[#6B7280] text-sm">No templates uploaded yet.</p>
            {canEdit && <p className="text-[#9CA3AF] text-xs mt-1">Click "Upload Template" to add your first template.</p>}
          </div>
        ) : (
          <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-[#E5E7EB]">
                  <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Template Name</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Description</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Size</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Uploaded</th>
                  <th className="px-4 py-3 w-36" />
                </tr>
              </thead>
              <tbody>
                {templates.map((t, i) => {
                  const badge = fileTypeBadge(t.file_type ?? t.name);
                  return (
                    <tr key={t.id} onClick={() => window.open(t.file_url, "_blank")}
                      className={`border-b border-[#E5E7EB] last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-[#F8F9FA]"} hover:bg-[#EEF2FF] transition-colors cursor-pointer`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg ${badge.bg} flex items-center justify-center flex-shrink-0`}>
                            <span className={`text-xs font-bold ${badge.text}`}>{badge.label}</span>
                          </div>
                          <span className="font-medium text-[#1A1A2E]">{t.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#6B7280] max-w-[200px] truncate">{t.description ?? "—"}</td>
                      <td className="px-4 py-3">
                        {t.file_type && <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>{t.file_type}</span>}
                      </td>
                      <td className="px-4 py-3 text-[#6B7280]">{fmtSize(t.file_size)}</td>
                      <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">{fmtDate(t.created_at)}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                          <a href={t.file_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#4A6FA5] hover:text-[#1E3A5F]">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download
                          </a>
                          {canEdit && (
                            <>
                              <button onClick={() => openEditTemplate(t)} className="text-xs font-medium text-[#6B7280] hover:text-[#1A1A2E]">Edit</button>
                              <button onClick={() => setConfirmDeleteTpl(t)} className="text-xs font-medium text-red-500 hover:text-red-700">Delete</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── MODAL: Add/Edit Form Row ── */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-[#1A1A2E]">{editingForm ? "Edit Row" : "Add New Row"}</h2>
              <button onClick={() => setShowFormModal(false)} className="text-[#9CA3AF] hover:text-[#6B7280]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleFormSubmit} className="space-y-3">
              {formError && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{formError}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">Rule No.</label>
                  <input value={formData.rule_no ?? ""} onChange={(e) => setFormData((p) => ({ ...p, rule_no: e.target.value }))} className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">Form No.</label>
                  <input value={formData.form_no ?? ""} onChange={(e) => setFormData((p) => ({ ...p, form_no: e.target.value }))} className={inp} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Form Description <span className="text-red-500">*</span></label>
                <input value={formData.rule_heading} onChange={(e) => setFormData((p) => ({ ...p, rule_heading: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Section</label>
                <input value={formData.page_no ?? ""} onChange={(e) => setFormData((p) => ({ ...p, page_no: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">URL <span className="text-[#9CA3AF]">(link to form document)</span></label>
                <input type="url" value={formData.url ?? ""} onChange={(e) => setFormData((p) => ({ ...p, url: e.target.value }))} placeholder="https://…" className={inp} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowFormModal(false)} className="flex-1 px-4 py-2 text-sm border border-[#E5E7EB] rounded-lg text-[#1A1A2E] hover:bg-[#F8F9FA] transition">Cancel</button>
                <button type="submit" disabled={formSaving} className="flex-1 px-4 py-2 text-sm bg-[#1E3A5F] hover:bg-[#162d4a] text-white rounded-lg font-medium transition disabled:opacity-60">
                  {formSaving ? "Saving…" : editingForm ? "Save Changes" : "Add Row"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Add/Edit Template ── */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-[#1A1A2E]">{editingTemplate ? "Edit Template" : "Upload Template"}</h2>
              <button onClick={() => setShowTemplateModal(false)} className="text-[#9CA3AF] hover:text-[#6B7280]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleTemplateSubmit} className="space-y-3">
              {tplError && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{tplError}</div>}
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Template Name <span className="text-red-500">*</span></label>
                <input value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="e.g. Adjournment Letter" className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Description</label>
                <textarea value={tplDesc} onChange={(e) => setTplDesc(e.target.value)} rows={2} placeholder="Brief description…" className={`${inp} resize-none`} />
              </div>
              {!editingTemplate ? (
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">File <span className="text-red-500">*</span></label>
                  <input type="file" onChange={(e) => setTplFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-[#6B7280] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#1E3A5F] file:text-white hover:file:bg-[#162d4a] file:cursor-pointer cursor-pointer" />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">File</label>
                  <p className="text-xs text-[#6B7280] bg-[#F8F9FA] rounded-lg px-3 py-2 truncate">{editingTemplate.file_url.split("/").pop()}</p>
                  <p className="text-xs text-[#9CA3AF] mt-1">To replace the file, delete this template and upload a new one.</p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowTemplateModal(false)} className="flex-1 px-4 py-2 text-sm border border-[#E5E7EB] rounded-lg text-[#1A1A2E] hover:bg-[#F8F9FA] transition">Cancel</button>
                <button type="submit" disabled={tplUploading} className="flex-1 px-4 py-2 text-sm bg-[#1E3A5F] hover:bg-[#162d4a] text-white rounded-lg font-medium transition disabled:opacity-60">
                  {tplUploading ? (editingTemplate ? "Saving…" : "Uploading…") : editingTemplate ? "Save Changes" : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CONFIRM: Delete Form ── */}
      {confirmDeleteForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl border border-[#E5E7EB] p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-[#1A1A2E] mb-2">Delete Row?</h3>
            <p className="text-sm text-[#6B7280] mb-5">"{confirmDeleteForm.rule_heading}" will be permanently removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteForm(null)} className="flex-1 px-4 py-2 text-sm border border-[#E5E7EB] rounded-lg text-[#1A1A2E] hover:bg-[#F8F9FA] transition">Cancel</button>
              <button onClick={() => handleDeleteForm(confirmDeleteForm)} disabled={deletingFormId === confirmDeleteForm.id}
                className="flex-1 px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:opacity-60">
                {deletingFormId === confirmDeleteForm.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM: Delete Template ── */}
      {confirmDeleteTpl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl border border-[#E5E7EB] p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-[#1A1A2E] mb-2">Delete Template?</h3>
            <p className="text-sm text-[#6B7280] mb-5">"{confirmDeleteTpl.name}" will be permanently removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteTpl(null)} className="flex-1 px-4 py-2 text-sm border border-[#E5E7EB] rounded-lg text-[#1A1A2E] hover:bg-[#F8F9FA] transition">Cancel</button>
              <button onClick={() => handleDeleteTemplate(confirmDeleteTpl)} disabled={deletingTplId === confirmDeleteTpl.id}
                className="flex-1 px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:opacity-60">
                {deletingTplId === confirmDeleteTpl.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
