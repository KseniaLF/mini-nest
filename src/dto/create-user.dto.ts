import { IsEmail, IsString, MinLength, IsInt, Min } from "class-validator";

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsInt()
  @Min(16)
  age!: number;
}
