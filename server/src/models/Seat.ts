import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from "sequelize-typescript";
import { Screen } from "./Screen";

@Table({
  tableName: "seats",
  timestamps: true,
  indexes: [
    { fields: ["screenId", "row", "col"], unique: true }
  ]
})
export class Seat extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Screen)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare screenId: string;

  @BelongsTo(() => Screen)
  declare screen: Screen;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare row: string; // "A", "B", ...

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare col: number; // 1, 2, ...

  @Column({
    type: DataType.STRING,
    defaultValue: "Standard",
  })
  declare type: string; // "Standard", "VIP", "Premium"

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  declare isAccessible: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  declare isActive: boolean;
}
