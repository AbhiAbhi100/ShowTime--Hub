import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from "sequelize-typescript";
import { Theatre } from "./Theatre";
import { Show } from "./Show";

@Table({
  tableName: "screens",
  timestamps: true,
})
export class Screen extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare name: string;

  @ForeignKey(() => Theatre)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare theatreId: string;

  @BelongsTo(() => Theatre)
  declare theatre: Theatre;

  @Column({
    type: DataType.JSON, // e.g., { rows: 10, cols: 15, aisles: [...] }
    allowNull: false,
  })
  declare seatLayout: any;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare totalSeats: number;

  @Column({
    type: DataType.STRING, // e.g., "Standard", "IMAX", "4DX"
    defaultValue: "Standard",
  })
  declare type: string;

  @HasMany(() => Show)
  declare shows: Show[];
}
