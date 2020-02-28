import { getRepository } from "typeorm";
import { Metadata } from "./entity/metadata";

export default class MetadataRepository {
  private repository = getRepository(Metadata);

  async findCurrentBlock(): Promise<string> {
    const currentBlock = await this.repository.findOne({name: "current_block"});

    if (currentBlock == null) {
      await this.repository.save({
        name: "current_block",
        value: "1"
      });
      return "1";
    }

    return currentBlock.value;
  }

  async updateCurrentBlock(block: string): Promise<void> {
    let currentBlock = await this.repository.findOne({name: "current_block"});

    if (currentBlock == null) {
      currentBlock = {
        id: null,
        name: "current_block",
        value: block
      };
    } else {
      currentBlock.value = block;
    }

    await this.repository.save(currentBlock);
  }
}