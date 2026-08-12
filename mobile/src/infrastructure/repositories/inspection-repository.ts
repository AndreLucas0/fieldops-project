import type { Answer, Inspection, Template, TemplateItem } from '@/domain/inspection';
import { newId } from '@/infrastructure/ids';
import { seedInspections, seedTemplates } from './mock-data';

/**
 * Contrato de acesso a dados das telas.
 *
 * Hoje é atendido por uma implementação em memória. Quando a API Spring Boot
 * (e o SQLite offline) entrarem, basta uma nova implementação desta mesma
 * interface — nenhuma tela precisa mudar, porque nenhuma delas conhece a
 * origem dos dados. É a fronteira prevista em docs/arquitetura.md §11.4.
 */
export interface InspectionRepository {
  listTemplates(): Promise<Template[]>;
  getTemplate(id: string): Promise<Template | null>;
  createTemplate(input: CreateTemplateInput): Promise<Template>;
  deleteTemplate(id: string): Promise<void>;

  listInspections(): Promise<Inspection[]>;
  getInspection(id: string): Promise<Inspection | null>;
  createInspection(input: CreateInspectionInput): Promise<Inspection>;
  saveAnswers(id: string, answers: Answer[]): Promise<Inspection>;
  completeInspection(id: string, answers: Answer[]): Promise<Inspection>;
}

export interface CreateTemplateInput {
  title: string;
  category?: string | null;
  description?: string | null;
  items: Omit<TemplateItem, 'id'>[];
}

export interface CreateInspectionInput {
  templateId: string;
  equipment?: string | null;
  site?: string | null;
}

/** Latência artificial para que os estados de carregamento sejam visíveis. */
const delay = (ms = 220) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

class InMemoryInspectionRepository implements InspectionRepository {
  private templates: Template[] = clone(seedTemplates);
  private inspections: Inspection[] = clone(seedInspections);

  async listTemplates() {
    await delay();
    return clone(this.templates);
  }

  async getTemplate(id: string) {
    await delay();
    return clone(this.templates.find((t) => t.id === id) ?? null);
  }

  async createTemplate(input: CreateTemplateInput) {
    await delay(320);
    const timestamp = new Date().toISOString();
    const template: Template = {
      id: newId(),
      title: input.title,
      category: input.category ?? null,
      description: input.description ?? null,
      items: input.items.map((item) => ({ ...item, id: newId() })),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.templates = [template, ...this.templates];
    return clone(template);
  }

  async deleteTemplate(id: string) {
    await delay();
    // As inspeções já criadas mantêm o snapshot dos itens (RN-021, RN-022),
    // por isso continuam íntegras mesmo sem o modelo de origem.
    this.templates = this.templates.filter((t) => t.id !== id);
  }

  async listInspections() {
    await delay();
    return clone(this.inspections);
  }

  async getInspection(id: string) {
    await delay();
    return clone(this.inspections.find((i) => i.id === id) ?? null);
  }

  async createInspection(input: CreateInspectionInput) {
    await delay(320);
    const template = this.templates.find((t) => t.id === input.templateId);
    if (!template) throw new Error('Modelo não encontrado');

    const timestamp = new Date().toISOString();
    const inspection: Inspection = {
      id: newId(),
      templateId: template.id,
      templateTitle: template.title,
      // RN-021 — a inspeção carrega uma cópia dos itens, não uma referência.
      itemsSnapshot: clone(template.items),
      answers: [],
      equipment: input.equipment ?? null,
      site: input.site ?? null,
      technician: 'Carlos Técnico',
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
      syncStatus: 'PENDING',
      scheduledFor: timestamp,
      startedAtDevice: timestamp,
      completedAtDevice: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.inspections = [inspection, ...this.inspections];
    return clone(inspection);
  }

  async saveAnswers(id: string, answers: Answer[]) {
    await delay(260);
    return this.patch(id, {
      answers: clone(answers),
      syncStatus: 'PENDING',
    });
  }

  async completeInspection(id: string, answers: Answer[]) {
    await delay(320);
    const timestamp = new Date().toISOString();
    return this.patch(id, {
      answers: clone(answers),
      status: 'SUBMITTED',
      // RN-042 — a data de conclusão é a do dispositivo; o servidor registra
      // a sua própria no momento em que receber a operação.
      completedAtDevice: timestamp,
      syncStatus: 'PENDING',
    });
  }

  private patch(id: string, changes: Partial<Inspection>): Inspection {
    const index = this.inspections.findIndex((i) => i.id === id);
    if (index < 0) throw new Error('Inspeção não encontrada');

    const updated: Inspection = {
      ...this.inspections[index],
      ...changes,
      updatedAt: new Date().toISOString(),
    };
    this.inspections[index] = updated;
    return clone(updated);
  }
}

export const inspectionRepository: InspectionRepository = new InMemoryInspectionRepository();
