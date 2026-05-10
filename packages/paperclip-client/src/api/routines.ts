// VENDORED FROM paperclip-minion/ui/src/api/routines.ts @ 1bcd90b38694bd8158356afd4c8bbb3994da6503

import type { PaperclipClientBase } from '../client.js';
import type {
  Routine,
  RoutineDetail,
  RoutineListItem,
  RoutineRun,
  RoutineRunSummary,
  RoutineTrigger,
  RoutineTriggerSecretMaterial,
} from '../types/routine.js';

export interface RoutineTriggerResponse {
  trigger: RoutineTrigger;
  secretMaterial: RoutineTriggerSecretMaterial | null;
}

export interface RotateRoutineTriggerResponse {
  trigger: RoutineTrigger;
  secretMaterial: RoutineTriggerSecretMaterial;
}

export function routinesApi(client: PaperclipClientBase) {
  return {
    list(companyId: string): Promise<RoutineListItem[]> {
      return client.request({ method: 'GET', path: `/api/companies/${companyId}/routines` });
    },

    create(companyId: string, data: Record<string, unknown>): Promise<Routine> {
      return client.request({ method: 'POST', path: `/api/companies/${companyId}/routines`, body: data });
    },

    get(id: string): Promise<RoutineDetail> {
      return client.request({ method: 'GET', path: `/api/routines/${id}` });
    },

    update(id: string, data: Record<string, unknown>): Promise<Routine> {
      return client.request({ method: 'PATCH', path: `/api/routines/${id}`, body: data });
    },

    listRuns(id: string, limit = 50): Promise<RoutineRunSummary[]> {
      return client.request({ method: 'GET', path: `/api/routines/${id}/runs`, query: { limit } });
    },

    createTrigger(id: string, data: Record<string, unknown>): Promise<RoutineTriggerResponse> {
      return client.request({ method: 'POST', path: `/api/routines/${id}/triggers`, body: data });
    },

    updateTrigger(id: string, data: Record<string, unknown>): Promise<RoutineTrigger> {
      return client.request({ method: 'PATCH', path: `/api/routine-triggers/${id}`, body: data });
    },

    deleteTrigger(id: string): Promise<void> {
      return client.request({ method: 'DELETE', path: `/api/routine-triggers/${id}` });
    },

    rotateTriggerSecret(id: string): Promise<RotateRoutineTriggerResponse> {
      return client.request({ method: 'POST', path: `/api/routine-triggers/${id}/rotate-secret`, body: {} });
    },

    run(id: string, data?: Record<string, unknown>): Promise<RoutineRun> {
      return client.request({ method: 'POST', path: `/api/routines/${id}/run`, body: data ?? {} });
    },
  };
}
