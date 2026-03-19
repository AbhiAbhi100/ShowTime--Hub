import { Table, Column, Model, DataType } from "sequelize-typescript";

@Table({
  tableName: "bookings",
  timestamps: true,
})
export class Booking extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;
}
