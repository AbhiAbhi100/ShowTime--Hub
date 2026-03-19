import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from "sequelize-typescript";
import { Show } from "./Show";
import { User } from "./User";

@Table({
  tableName: "seat_locks",
  timestamps: true,
  indexes: [
    { fields: ["showId", "seatId"], unique: true }, // Prevent double locking
    { fields: ["expiresAt"] } // For cleanup
  ]
})
export class SeatLock extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Show)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare showId: string;

  @BelongsTo(() => Show)
  declare show: Show;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare seatId: string; // "A1"

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare userId: string;

  @BelongsTo(() => User)
  declare user: User;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  declare lockedAt: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  declare expiresAt: Date;
}
