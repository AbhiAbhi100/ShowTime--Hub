import { Table, Column, Model, DataType, HasMany } from "sequelize-typescript";
import { Show } from "./Show";

@Table({
  tableName: "movies",
  timestamps: true,
  indexes: [
    { fields: ["title"] },
    { fields: ["releaseDate", "status"] },
    { fields: ["tmdbId"] },
  ]
})
export class Movie extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    unique: true // TMDB ID should be unique if present
  })
  declare tmdbId: string | null;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare title: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare posterUrl: string | null;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare bannerUrl: string | null;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare language: string | null;

  @Column({
    type: DataType.JSON,
    defaultValue: [],
  })
  declare genre: string[];

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare duration: string | null;

  @Column({
    type: DataType.FLOAT,
    allowNull: true,
  })
  declare rating: number | null;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare releaseDate: Date | null;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare description: string | null;

  @Column({
    type: DataType.JSON,
    defaultValue: [],
  })
  declare castMembers: any[]; // Array of { name, character, profile }

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare director: string | null;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare trailerUrl: string | null;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  declare isActive: boolean;

  @Column({
    type: DataType.ENUM("active", "inactive", "expired"),
    defaultValue: "active",
  })
  declare status: "active" | "inactive" | "expired";

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  declare isFeatured: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  declare isAutoFetched: boolean;

  @HasMany(() => Show)
  declare shows: Show[];
}
