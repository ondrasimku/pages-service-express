import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBinItems1734277000000 implements MigrationInterface {
    name = 'AddBinItems1734277000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "bin_items" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
            "user_id" uuid NOT NULL, 
            "item_type" character varying NOT NULL, 
            "item_id" uuid NOT NULL, 
            "item_data" jsonb NOT NULL, 
            "deleted_at" TIMESTAMP NOT NULL, 
            "created_at" TIMESTAMP NOT NULL DEFAULT now(), 
            CONSTRAINT "PK_bin_items" PRIMARY KEY ("id")
        )`);
        
        await queryRunner.query(`CREATE INDEX "IDX_bin_items_user_id" ON "bin_items" ("user_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_bin_items_user_deleted" ON "bin_items" ("user_id", "deleted_at")`);
        await queryRunner.query(`CREATE INDEX "IDX_bin_items_type" ON "bin_items" ("item_type")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_bin_items_type"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bin_items_user_deleted"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bin_items_user_id"`);
        await queryRunner.query(`DROP TABLE "bin_items"`);
    }
}
