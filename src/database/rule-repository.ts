import { getRepository } from "typeorm";
import { Rule } from "./entity/rule";

export default class RuleRepository {
  private repository = getRepository(Rule);

  async save(rule: Rule): Promise<void> {
    const exists = await this.repository.findOne({name: rule.name, data: rule.data});

    if (!exists) {
      await this.repository.save(rule);
    }
  }

  async all(): Promise<Rule[]> {
    return await this.repository.find();
  }
}