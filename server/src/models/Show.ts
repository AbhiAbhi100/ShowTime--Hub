import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from "sequelize-typescript";
import { Movie } from "./Movie";
import { Theatre } from "./Theatre";
import { Screen } from "./Screen";
import { Booking } from "./Booking";

@Table({
  tableName: "shows",
  timestamps: true,
  indexes: [
    { fields: ["movieId", "showDate"] },
    { fields: ["theatreId", "showDate"] },
    { unique: true, fields: ["screenId", "showDate", "showTime"] }
  ]
})
export class Show extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Movie)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare movieId: string;

  @BelongsTo(() => Movie)
  declare movie: Movie;

  @ForeignKey(() => Theatre)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare theatreId: string;

  @BelongsTo(() => Theatre)
  declare theatre: Theatre;

  @ForeignKey(() => Screen)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare screenId: string;

  @BelongsTo(() => Screen)
  declare screen: Screen;

  @Column({
    type: DataType.DATEONLY, // YYYY-MM-DD
    allowNull: false,
  })
  declare showDate: string;

  @Column({
    type: DataType.STRING, // HH:mm
    allowNull: false,
  })
  declare showTime: string;

  @Column({
    type: DataType.JSON, // { "Standard": 150, "Premium": 200 }
    defaultValue: {},
  })
  declare prices: any;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare totalSeats: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare availableSeats: number;

  @Column({
    type: DataType.JSON, // List of booked seat IDs ["A1", "A2"]
    defaultValue: [],
  })
  declare bookedSeatIds: string[];

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  declare isActive: boolean;

  @HasMany(() => Booking)
  declare bookings: Booking[];
}
