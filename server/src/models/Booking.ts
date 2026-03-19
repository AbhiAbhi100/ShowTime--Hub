import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from "sequelize-typescript";
// import type { User } from "./User";
// import { Show } from "./Show";

@Table({
  tableName: "bookings",
  timestamps: true,
  indexes: [
    { fields: ["userId"] },
    { fields: ["showId"] },
    { fields: ["bookingId"], unique: true },
  ]
})
export class Booking extends Model {
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
  declare bookingId: string; // Readable ID like BK123456

  @ForeignKey(() => require("./User").User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare userId: string;

  @BelongsTo(() => require("./User").User)
  declare user: any;

  @ForeignKey(() => require("./Show").Show)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare showId: string;

  @BelongsTo(() => require("./Show").Show)
  declare show: any;

  // Cache some details to avoid complex joins for simple history checks
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare movieTitle: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare moviePoster: string | null;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare theatreName: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare theatreLocation: string | null;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare showTime: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare showDate: string;

  @Column({
    type: DataType.JSON, // ["A1", "B2"]
    allowNull: false,
  })
  declare seats: string[];

  @Column({
    type: DataType.FLOAT,
    allowNull: false,
  })
  declare totalAmount: number;

  @Column({
    type: DataType.ENUM("pending", "confirmed", "cancelled", "completed"),
    defaultValue: "pending",
  })
  declare status: "pending" | "confirmed" | "cancelled" | "completed";

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare paymentId: string | null;
}
