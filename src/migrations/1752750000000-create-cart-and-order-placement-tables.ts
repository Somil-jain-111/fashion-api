import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateCartAndOrderPlacementTables1752750000000 implements MigrationInterface {
  name = 'CreateCartAndOrderPlacementTables1752750000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'carts',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'active', type: 'boolean', default: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
          { name: 'user_id', type: 'bigint' },
          { name: 'distributor_id', type: 'bigint' },
          { name: 'totalQuantity', type: 'int', default: 0 },
          { name: 'totalAmount', type: 'decimal', precision: 12, scale: 2, default: 0 },
          { name: 'discountAmount', type: 'decimal', precision: 12, scale: 2, default: 0 },
          { name: 'gstAmount', type: 'decimal', precision: 12, scale: 2, default: 0 },
          { name: 'totalPayable', type: 'decimal', precision: 12, scale: 2, default: 0 },
          { name: 'is_active', type: 'boolean', default: true },
        ],
      }),
      true
    );

    await queryRunner.createTable(
      new Table({
        name: 'cart_items',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'active', type: 'boolean', default: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
          { name: 'cart_id', type: 'bigint' },
          { name: 'productId', type: 'int' },
          { name: 'categoryId', type: 'int' },
          { name: 'subCategoryId', type: 'int' },
          { name: 'color', type: 'varchar' },
          { name: 'size', type: 'varchar' },
          { name: 'cartonSize', type: 'int' },
          { name: 'cartonQuantity', type: 'int', default: 1 },
          { name: 'totalArticles', type: 'int' },
          { name: 'unitPrice', type: 'decimal', precision: 10, scale: 2 },
          { name: 'mrp', type: 'decimal', precision: 10, scale: 2 },
          { name: 'discount', type: 'int', default: 0 },
          { name: 'totalAmount', type: 'decimal', precision: 10, scale: 2 },
          { name: 'isSelected', type: 'boolean', default: true },
        ],
      }),
      true
    );

    await queryRunner.createTable(
      new Table({
        name: 'order_placements',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'active', type: 'boolean', default: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
          { name: 'orderNumber', type: 'varchar', length: '40', isUnique: true },
          { name: 'user_id', type: 'bigint' },
          { name: 'distributor_id', type: 'bigint' },
          { name: 'source', type: 'enum', enum: ['CART', 'BUY_NOW'] },
          { name: 'status', type: 'enum', enum: ['PLACED', 'CANCELLED'], default: "'PLACED'" },
          { name: 'totalQuantity', type: 'int', default: 0 },
          { name: 'totalAmount', type: 'decimal', precision: 12, scale: 2, default: 0 },
          { name: 'discountAmount', type: 'decimal', precision: 12, scale: 2, default: 0 },
          { name: 'gstAmount', type: 'decimal', precision: 12, scale: 2, default: 0 },
          { name: 'totalPayable', type: 'decimal', precision: 12, scale: 2, default: 0 },
        ],
      }),
      true
    );

    await queryRunner.createTable(
      new Table({
        name: 'order_placement_items',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'active', type: 'boolean', default: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
          { name: 'order_id', type: 'bigint' },
          { name: 'productId', type: 'int' },
          { name: 'categoryId', type: 'int' },
          { name: 'subCategoryId', type: 'int' },
          { name: 'productName', type: 'varchar', length: '255' },
          { name: 'thumbnail', type: 'varchar', length: '500', isNullable: true },
          { name: 'color', type: 'varchar', length: '100' },
          { name: 'size', type: 'varchar', length: '30' },
          { name: 'cartonSize', type: 'int' },
          { name: 'cartonQuantity', type: 'int', default: 1 },
          { name: 'totalArticles', type: 'int' },
          { name: 'unitPrice', type: 'decimal', precision: 10, scale: 2 },
          { name: 'mrp', type: 'decimal', precision: 10, scale: 2 },
          { name: 'discount', type: 'decimal', precision: 10, scale: 2, default: 0 },
          { name: 'totalAmount', type: 'decimal', precision: 10, scale: 2 },
        ],
      }),
      true
    );

    await queryRunner.createIndex(
      'carts',
      new TableIndex({ columnNames: ['user_id', 'distributor_id'] })
    );
    await queryRunner.createIndex(
      'cart_items',
      new TableIndex({ columnNames: ['cart_id', 'productId'] })
    );
    await queryRunner.createIndex(
      'order_placements',
      new TableIndex({ columnNames: ['user_id', 'distributor_id'] })
    );
    await queryRunner.createIndex(
      'order_placement_items',
      new TableIndex({ columnNames: ['order_id', 'productId'] })
    );

    await queryRunner.createForeignKeys('carts', [
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
      }),
      new TableForeignKey({
        columnNames: ['distributor_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
      }),
    ]);

    await queryRunner.createForeignKeys('cart_items', [
      new TableForeignKey({
        columnNames: ['cart_id'],
        referencedTableName: 'carts',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    ]);

    await queryRunner.createForeignKeys('order_placements', [
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
      }),
      new TableForeignKey({
        columnNames: ['distributor_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
      }),
    ]);

    await queryRunner.createForeignKeys('order_placement_items', [
      new TableForeignKey({
        columnNames: ['order_id'],
        referencedTableName: 'order_placements',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    ]);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('order_placement_items', true);
    await queryRunner.dropTable('order_placements', true);
    await queryRunner.dropTable('cart_items', true);
    await queryRunner.dropTable('carts', true);
  }
}
