"use client";

import Link from "next/link";

interface Document {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  created_at: string;
  uploaded_by_user: { first_name: string; last_name: string } | null;
  appeal: {
    id: string;
    assessment_year: string | null;
    financial_year: string | null;
    act_regulation: string | null;
    client_org: { name: string } | null;
  } | null;
}

interface Props {
  documents: Document[];
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

function FileIcon() {
  return (
    <svg className="w-8 h-8 text-[#4A6FA5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

export default function DocumentsClient({ documents, canEdit }: Props) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A2E]">Documents</h1>
        <p className="text-[#6B7280] text-sm mt-0.5">
          {documents.length} document{documents.length !== 1 ? "s" : ""} across all appeals
        </p>
      </div>

      {documents.length === 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-16 text-center">
          <div className="flex justify-center mb-3 opacity-30">
            <FileIcon />
          </div>
          <p className="text-[#6B7280] text-sm">No documents uploaded yet.</p>
          <p className="text-[#9CA3AF] text-xs mt-1">
            Upload documents from within an appeal's detail page.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F8F9FA]">
                  <th className="text-left px-4 py-3 font-medium text-[#6B7280]">File</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Appeal</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Client</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Uploaded By</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Date</th>
                  <th className="px-4 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => {
                  const appeal = doc.appeal;
                  const appealLabel = [appeal?.financial_year, appeal?.assessment_year]
                    .filter(Boolean).join(" / ") || appeal?.act_regulation || "—";
                  const uploader = doc.uploaded_by_user;
                  return (
                    <tr key={doc.id} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F8F9FA] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-[#4A6FA5] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div>
                            <p className="font-medium text-[#1A1A2E] truncate max-w-[200px]">{doc.file_name}</p>
                            {doc.file_size && <p className="text-xs text-[#9CA3AF]">{fmtSize(doc.file_size)}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">{appealLabel}</td>
                      <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap truncate max-w-[160px]">
                        {appeal?.client_org?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">
                        {uploader ? `${uploader.first_name} ${uploader.last_name}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">{fmtDate(doc.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs font-medium text-[#4A6FA5] hover:text-[#1E3A5F]">
                            View
                          </a>
                          {appeal?.id && (
                            <Link href={`/appeals/${appeal.id}`}
                              className="text-xs font-medium text-[#6B7280] hover:text-[#1A1A2E]">
                              Appeal →
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
