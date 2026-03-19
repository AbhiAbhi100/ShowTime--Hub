import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from "sequelize-typescript";
import { Booking } from "./Booking";
import { User } from "./User";

@Table({
  tableName: "payments",
  timestamps: true,
  indexes: [
    { fields: ["bookingId"] },
    { fields: ["userId"] },
    { fields: ["transactionId"], unique: true }
  ]
})
export class Payment extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare userId: string;

  @BelongsTo(() => User)
  declare user: User;

  @ForeignKey(() => Booking)
  @Column({
    type: DataType.UUID,
    allowNull: true, // Can be null if payment is initiated before booking
  })
  declare bookingId: string | null;

  @BelongsTo(() => Booking)
  declare booking: Booking;

  @Column({
    type: DataType.FLOAT,
    allowNull: false,
  })
  declare amount: number;

  @Column({
    type: DataType.STRING,
    defaultValue: "inr",
  })
  declare currency: string;

  @Column({
    type: DataType.ENUM("pending", "succeeded", "failed", "refunded"),
    defaultValue: "pending",
  })
  declare status: "pending" | "succeeded" | "failed" | "refunded";

  @Column({
    type: DataType.STRING,
    allowNull: false, // e.g., "stripe", "razorpay" 
  })
  declare paymentMethod: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare transactionId: string; // Stripe PaymentIntent ID

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  declare metadata: any;

  @Column({
    type: DataType.DATE,
  })
  declare paymentDate: Date;
}
