import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from "sequelize-typescript";
import { City } from "./City";
import { Screen } from "./Screen";
import { Show } from "./Show";

@Table({
  tableName: "theatres",
  timestamps: true,
})
export class Theatre extends Model {
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

  @ForeignKey(() => City)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare cityId: string;

  @BelongsTo(() => City)
  declare city: City;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare address: string | null;

  @Column({
    type: DataType.JSON,
    defaultValue: [],
  })
  declare amenities: string[];

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare image: string | null;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  declare isActive: boolean;

  @HasMany(() => Screen)
  declare screens: Screen[];

  @HasMany(() => Show)
  declare shows: Show[];
}
