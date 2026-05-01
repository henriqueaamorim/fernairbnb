import { useMemo, useState } from "react";

type SourcePlatform = "airbnb" | "booking" | "lodgify" | "other";
type MappingField = "reservationCode" | "startDate" | "endDate" | "platform" | "nights" | "bookingValue" | "status" | "unit" | "guestName";

type MappingRecord = Record<MappingField, string>;

interface UploadedFile {
  fileId: string;
  name: string;
  source: SourcePlatform;
}

interface Reservation {
  consolidationKey: string;
  reservationCode: string;
  startDate: string;
  endDate: string;
  platform: string;
  nights: number;
  bookingValue: number;
  status: string;
  unit: string;
  guestName: string;
  conflictFlags: string[];
}

interface Conflict {
  conflictId: string;
  reservationKey: string;
  field: string;
  suggestedValue: string | number;
  severity: "warning" | "critical";
  reason: string;
}

const baseMapping: Record<SourcePlatform, MappingRecord> = {
  airbnb: {
    reservationCode: "Código de Confirmação",
    startDate: "Check-in",
    endDate: "Check-out",
    platform: "Plataforma",
    nights: "Noites",
    bookingValue: "Valor",
    status: "Status",
    unit: "Unidade",
    guestName: "Hóspede"
  },
  booking: {
    reservationCode: "Reference Number",
    startDate: "Check-in",
    endDate: "Check-out",
    platform: "Plataforma",
    nights: "Noites",
    bookingValue: "Valor",
    status: "Status",
    unit: "Unidade",
    guestName: "Guest"
  },
  lodgify: {
    reservationCode: "Reservation Code",
    startDate: "Start Date",
    endDate: "End Date",
    platform: "Channel",
    nights: "Nights",
    bookingValue: "Booking Value",
    status: "Status",
    unit: "Property",
    guestName: "Guest Name"
  },
  other: {
    reservationCode: "reservationCode",
    startDate: "startDate",
    endDate: "endDate",
    platform: "platform",
    nights: "nights",
    bookingValue: "bookingValue",
    status: "status",
    unit: "unit",
    guestName: "guestName"
  }
};

function App() {
  const [jobId, setJobId] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [sourceMap, setSourceMap] = useState<Record<string, SourcePlatform>>({});
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [mappingByFile, setMappingByFile] = useState<Record<string, MappingRecord>>({});
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [status, setStatus] = useState("Inicie um job e faça upload de até 10 arquivos.");
  const [isLoading, setIsLoading] = useState(false);

  const totalBooking = useMemo(() => reservations.reduce((acc, item) => acc + item.bookingValue, 0), [reservations]);

  async function startJob() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/v2/jobs", { method: "POST" });
      const data = (await response.json()) as { jobId: string };
      setJobId(data.jobId);
      setStatus(`Job iniciado: ${data.jobId}`);
    } catch (error) {
      setStatus(`Falha ao iniciar job: ${String(error)}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function uploadFiles() {
    if (!jobId) return setStatus("Crie o job antes do upload.");
    if (files.length === 0) return setStatus("Selecione arquivos para upload.");
    if (files.length > 10) return setStatus("Limite máximo: 10 arquivos.");

    setIsLoading(true);
    setStatus("Enviando arquivos...");
    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append("files", file);
      }
      formData.append("sourceMap", JSON.stringify(sourceMap));
      const response = await fetch(`/api/v2/jobs/${jobId}/files`, { method: "POST", body: formData });
      if (!response.ok) throw new Error(`Erro ${response.status}`);
      const data = (await response.json()) as { files: UploadedFile[] };
      setUploadedFiles(data.files);
      const initialMappings: Record<string, MappingRecord> = {};
      for (const uploaded of data.files) {
        initialMappings[uploaded.fileId] = { ...baseMapping[uploaded.source] };
      }
      setMappingByFile(initialMappings);
      setStatus(`${data.files.length} arquivo(s) enviados. Configure e valide o mapping.`);
    } catch (error) {
      setStatus(`Falha no upload: ${String(error)}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function validateAllMappings() {
    if (!jobId) return;
    setIsLoading(true);
    setStatus("Validando mappings por arquivo...");
    try {
      for (const uploaded of uploadedFiles) {
        const mapping = mappingByFile[uploaded.fileId];
        const response = await fetch(`/api/v2/jobs/${jobId}/mappings/validate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId: uploaded.fileId, source: uploaded.source, mapping })
        });
        const data = await response.json();
        if (!response.ok || !data.valid) {
          throw new Error(`Mapping inválido para ${uploaded.name}: ${(data.missingFields ?? []).join(", ")}`);
        }
      }
      setStatus("Todos os mappings foram validados.");
    } catch (error) {
      setStatus(`Erro na validação de mapping: ${String(error)}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function generatePreview() {
    if (!jobId) return;
    setIsLoading(true);
    setStatus("Consolidando reservas e detectando conflitos...");
    try {
      const response = await fetch(`/api/v2/jobs/${jobId}/reconcile/preview`, { method: "POST" });
      if (!response.ok) throw new Error(`Erro ${response.status}`);
      const data = (await response.json()) as { reservations: Reservation[]; conflicts: Conflict[]; summary: { reservationsOut: number } };
      setReservations(data.reservations);
      setConflicts(data.conflicts);
      setStatus(`Prévia pronta com ${data.summary.reservationsOut} reservas e ${data.conflicts.length} conflitos.`);
    } catch (error) {
      setStatus(`Falha na prévia: ${String(error)}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function applyConflictSuggestions() {
    if (!jobId) return;
    setIsLoading(true);
    try {
      const resolutions = conflicts.map((conflict) => ({ conflictId: conflict.conflictId, value: conflict.suggestedValue }));
      const response = await fetch(`/api/v2/jobs/${jobId}/reconcile/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolutions, patches: [] })
      });
      if (!response.ok) throw new Error(`Erro ${response.status}`);
      const data = (await response.json()) as { reservations: Reservation[] };
      setReservations(data.reservations);
      setStatus("Resoluções automáticas aplicadas.");
    } catch (error) {
      setStatus(`Erro ao aplicar resoluções: ${String(error)}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function downloadExport(type: "pdf" | "xls" | "bundle") {
    if (!jobId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/v2/jobs/${jobId}/exports/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerName: "Suely Marcelino Da Rocha",
          ownerDocument: "274.233.398-30",
          closingPeriod: "Janeiro_2026",
          unitName: "Sunrise 413"
        })
      });
      if (!response.ok) throw new Error(`Erro ${response.status}`);
      const blob = await response.blob();
      const extension = type === "xls" ? "xlsx" : type === "bundle" ? "zip" : "pdf";
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `relatorio-v2.${extension}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setStatus(`Exportação ${type.toUpperCase()} concluída.`);
    } catch (error) {
      setStatus(`Erro na exportação: ${String(error)}`);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>fernairbnb v2</h1>
        <p>Consolidação multiarquivo</p>
        <ul>
          <li>1. Criar job</li>
          <li>2. Upload (até 10)</li>
          <li>3. Mapping por arquivo</li>
          <li>4. Prévia e conflitos</li>
          <li>5. Exportar PDF/XLS</li>
        </ul>
      </aside>
      <main className="content">
        <section className="hero-card">
          <div>
            <h2>Fechamento mensal consolidado</h2>
            <p>{status}</p>
          </div>
          <div className="metrics">
            <article>
              <span>Arquivos</span>
              <strong>{uploadedFiles.length}</strong>
            </article>
            <article>
              <span>Reservas</span>
              <strong>{reservations.length}</strong>
            </article>
            <article>
              <span>Total</span>
              <strong>R$ {totalBooking.toFixed(2)}</strong>
            </article>
          </div>
        </section>

        <section className="card">
          <h3>Passo 1 e 2 - Job + Upload</h3>
          <div className="actions">
            <button onClick={startJob} disabled={isLoading}>
              Iniciar Job
            </button>
            <input
              type="file"
              multiple
              accept=".csv,.xls,.xlsx"
              onChange={(event) => {
                const selected = Array.from(event.target.files ?? []);
                setFiles(selected);
                const next: Record<string, SourcePlatform> = {};
                for (const file of selected) {
                  next[file.name] = file.name.toLowerCase().includes("airbnb")
                    ? "airbnb"
                    : file.name.toLowerCase().includes("booking")
                      ? "booking"
                      : file.name.toLowerCase().includes("lodgify")
                        ? "lodgify"
                        : "other";
                }
                setSourceMap(next);
              }}
            />
            <button onClick={uploadFiles} disabled={isLoading || !jobId}>
              Enviar arquivos
            </button>
          </div>
          {files.length > 0 && (
            <div className="mapping-grid">
              {files.map((file) => (
                <label key={file.name}>
                  Fonte para {file.name}
                  <select
                    value={sourceMap[file.name] ?? "other"}
                    onChange={(event) =>
                      setSourceMap((prev) => ({
                        ...prev,
                        [file.name]: event.target.value as SourcePlatform
                      }))
                    }
                  >
                    <option value="airbnb">Airbnb</option>
                    <option value="booking">Booking</option>
                    <option value="lodgify">Lodgify</option>
                    <option value="other">Outro</option>
                  </select>
                </label>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <h3>Passo 3 - Mapping por arquivo</h3>
          {uploadedFiles.map((file) => (
            <div key={file.fileId} className="file-block">
              <h4>{file.name}</h4>
              <div className="mapping-grid">
                {(Object.keys(baseMapping.other) as MappingField[]).map((field) => (
                  <label key={`${file.fileId}-${field}`}>
                    {field}
                    <input
                      value={mappingByFile[file.fileId]?.[field] ?? ""}
                      onChange={(event) =>
                        setMappingByFile((prev) => ({
                          ...prev,
                          [file.fileId]: { ...(prev[file.fileId] ?? baseMapping.other), [field]: event.target.value }
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
          <div className="actions">
            <button onClick={validateAllMappings} disabled={isLoading || uploadedFiles.length === 0}>
              Validar mappings
            </button>
            <button onClick={generatePreview} disabled={isLoading || uploadedFiles.length === 0}>
              Gerar prévia consolidada
            </button>
          </div>
        </section>

        <section className="card">
          <h3>Passo 4 - Conflitos e revisão</h3>
          <p className="summary">Conflitos detectados: {conflicts.length}</p>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Reserva</th>
                  <th>Campo</th>
                  <th>Sugestão</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {conflicts.map((conflict) => (
                  <tr key={conflict.conflictId}>
                    <td>{conflict.severity}</td>
                    <td>{conflict.reservationKey}</td>
                    <td>{conflict.field}</td>
                    <td>{String(conflict.suggestedValue)}</td>
                    <td>{conflict.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={applyConflictSuggestions} disabled={isLoading || conflicts.length === 0}>
            Aplicar sugestões automáticas
          </button>
        </section>

        <section className="card">
          <h3>Passo 5 - Pré-visualização e exportação</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Período</th>
                  <th>Plataforma</th>
                  <th>Noites</th>
                  <th>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((row) => (
                  <tr key={row.consolidationKey}>
                    <td>{row.reservationCode}</td>
                    <td>
                      {row.startDate} a {row.endDate}
                    </td>
                    <td>{row.platform}</td>
                    <td>{row.nights}</td>
                    <td>R$ {row.bookingValue.toFixed(2)}</td>
                    <td>{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="actions">
            <button onClick={() => downloadExport("pdf")} disabled={isLoading || reservations.length === 0}>
              Exportar PDF V1
            </button>
            <button onClick={() => downloadExport("xls")} disabled={isLoading || reservations.length === 0}>
              Exportar XLS
            </button>
            <button onClick={() => downloadExport("bundle")} disabled={isLoading || reservations.length === 0}>
              Exportar ZIP (PDF+XLS)
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
