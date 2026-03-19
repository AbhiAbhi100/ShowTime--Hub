import { Table, Column, Model, DataType, BeforeSave, HasMany } from "sequelize-typescript";
import bcrypt from "bcryptjs";
import { Booking } from "./Booking";

@Table({
  tableName: "users",
  timestamps: true,
})
export class User extends Model {
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
    validate: {
      isEmail: true,
    },
  })
  declare email: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare password: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare fullName: string | null;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare phone: string | null;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare avatarUrl: string | null;

  @Column({
    type: DataType.ENUM("user", "admin"),
    defaultValue: "user",
  })
  declare role: "user" | "admin";

  @HasMany(() => Booking)
  declare bookings: Booking[];

  @BeforeSave
  static async hashPassword(instance: User) {
    if (instance.changed("password")) {
      const salt = await bcrypt.genSalt(12);
      instance.password = await bcrypt.hash(instance.password, salt);
    }
  }

  async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }

  // Hide password when converting to JSON
  toJSON(): any {
    const values = { ...this.get() };
    delete values.password;
    return values;
  }
}
