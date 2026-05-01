import { randomUUID } from "node:crypto";
import type { ConsolidatedReservation, JobFile, JobSession, MappingV2, ReservationConflict } from "./types.js";

const SESSION_TTL_MS = 60 * 60 * 1000;

export class JobStoreService {
  private readonly sessions = new Map<string, JobSession>();

  createJob(): JobSession {
    const now = Date.now();
    const session: JobSession = {
      jobId: `job_${randomUUID()}`,
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
      files: [],
      mappings: {},
      lastPreview: null
    };
    this.sessions.set(session.jobId, session);
    return session;
  }

  getJob(jobId: string): JobSession {
    const session = this.sessions.get(jobId);
    if (!session) {
      throw new Error("Job não encontrado.");
    }
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(jobId);
      throw new Error("Job expirado.");
    }
    return session;
  }

  addFiles(jobId: string, files: Array<Omit<JobFile, "fileId">>): JobFile[] {
    const session = this.getJob(jobId);
    if (session.files.length + files.length > 10) {
      throw new Error("Limite de 10 arquivos por processamento excedido.");
    }

    const appended = files.map((file) => ({
      ...file,
      fileId: `f_${randomUUID()}`
    }));
    session.files.push(...appended);
    return appended;
  }

  saveMapping(jobId: string, mapping: MappingV2): void {
    const session = this.getJob(jobId);
    session.mappings[mapping.fileId] = mapping;
  }

  savePreview(jobId: string, reservations: ConsolidatedReservation[], conflicts: ReservationConflict[]): void {
    const session = this.getJob(jobId);
    session.lastPreview = { reservations, conflicts };
  }
}
