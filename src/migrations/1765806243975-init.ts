import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1765806243975 implements MigrationInterface {
    name = 'Init1765806243975'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "folders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "parent_id" uuid, "name" character varying NOT NULL, "position" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8578bd31b0e7f6d6c2480dbbca8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "pages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "folder_id" uuid, "title" character varying NOT NULL, "content" jsonb NOT NULL DEFAULT '{}', "is_published" boolean NOT NULL DEFAULT false, "slug" character varying, "published_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_fe66ca6a86dc94233e5d7789535" UNIQUE ("slug"), CONSTRAINT "PK_8f21ed625aa34c8391d636b7d3b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_98ceb5433a66707b9c649503dc" ON "pages" ("user_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_e32f5f81e00b6778acb3dc6a9d" ON "pages" ("slug") WHERE slug IS NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_c6f43bbf213e97ad04c5fa1814" ON "pages" ("user_id", "folder_id") `);
        await queryRunner.query(`CREATE TABLE "page_links" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "from_page_id" uuid NOT NULL, "to_page_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a2f5911f9985a1d3c90c0636e70" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0b56cbfcd988b63ad6cccb0c39" ON "page_links" ("to_page_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c59d1396cbb6a1a86035c28898" ON "page_links" ("from_page_id", "to_page_id") `);
        await queryRunner.query(`ALTER TABLE "folders" ADD CONSTRAINT "FK_938a930768697b6ece215667d8e" FOREIGN KEY ("parent_id") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pages" ADD CONSTRAINT "FK_e48ebc43664f6e347f2a6cab4e3" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "page_links" ADD CONSTRAINT "FK_b63cf0dfa9fac97c5e08f889fbd" FOREIGN KEY ("from_page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "page_links" ADD CONSTRAINT "FK_0b56cbfcd988b63ad6cccb0c397" FOREIGN KEY ("to_page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "page_links" DROP CONSTRAINT "FK_0b56cbfcd988b63ad6cccb0c397"`);
        await queryRunner.query(`ALTER TABLE "page_links" DROP CONSTRAINT "FK_b63cf0dfa9fac97c5e08f889fbd"`);
        await queryRunner.query(`ALTER TABLE "pages" DROP CONSTRAINT "FK_e48ebc43664f6e347f2a6cab4e3"`);
        await queryRunner.query(`ALTER TABLE "folders" DROP CONSTRAINT "FK_938a930768697b6ece215667d8e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c59d1396cbb6a1a86035c28898"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0b56cbfcd988b63ad6cccb0c39"`);
        await queryRunner.query(`DROP TABLE "page_links"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c6f43bbf213e97ad04c5fa1814"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e32f5f81e00b6778acb3dc6a9d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_98ceb5433a66707b9c649503dc"`);
        await queryRunner.query(`DROP TABLE "pages"`);
        await queryRunner.query(`DROP TABLE "folders"`);
    }

}
