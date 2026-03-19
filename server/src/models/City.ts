import { Table, Column, Model, DataType, HasMany } from "sequelize-typescript";
import { Theatre } from "./Theatre";

@Table({
  tableName: "cities",
  timestamps: true,
  paranoid: true,
})
export class City extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  declare name: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare state: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare icon: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  declare code: string; // e.g., 'BLR', 'MUM'

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  declare isActive: boolean;

  @HasMany(() => Theatre)
  declare theatres: Theatre[];
}
