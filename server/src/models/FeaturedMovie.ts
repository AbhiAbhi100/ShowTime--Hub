import { Table, Column, Model, DataType } from "sequelize-typescript";

@Table({
  tableName: "featured_movies",
  timestamps: true,
})
export class FeaturedMovie extends Model {
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
  declare movieId: string;

  @Column({
    type: DataType.STRING,
    defaultValue: "tmdb",
  })
  declare movieType: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare title: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare poster: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  declare isActive: boolean;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  declare displayOrder: number;
}

