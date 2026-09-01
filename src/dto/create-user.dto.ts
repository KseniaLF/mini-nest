import * as z from "zod";

export const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  age: z.int().min(16),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
