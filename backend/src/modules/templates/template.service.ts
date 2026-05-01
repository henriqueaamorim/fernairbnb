import type { MappingTemplate } from "../../shared/types/domain.js";
import { MappingService } from "../mapping/mapping.service.js";

export class TemplateService {
  private readonly templates = new Map<string, MappingTemplate>();
  private readonly mappingService = new MappingService();

  validate(template: MappingTemplate): { valid: boolean; missingFields: string[] } {
    const result = this.mappingService.validateTemplate(template);
    return {
      valid: result.valid,
      missingFields: result.missingFields
    };
  }

  upsert(template: MappingTemplate): MappingTemplate {
    this.templates.set(template.name, template);
    return template;
  }

  getByName(name: string): MappingTemplate | null {
    return this.templates.get(name) ?? null;
  }
}
