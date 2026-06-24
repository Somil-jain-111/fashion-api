// src/common/validators/is-strong-password.validator.ts

import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from "class-validator";

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "IsStrongPassword",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: string) {
          if (!value) return false;

          const minLength = value.length >= 8;
          const hasUppercase = /[A-Z]/.test(value);
          const hasLowercase = /[a-z]/.test(value);
          const hasNumber = /\d/.test(value);
          const hasSpecialChar = /[@$!%*?&#^()[\]{}_\-+=]/.test(value);

          return (
            minLength &&
            hasUppercase &&
            hasLowercase &&
            hasNumber &&
            hasSpecialChar
          );
        },

        defaultMessage(args: ValidationArguments) {
          return `${args.property} must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character`;
        },
      },
    });
  };
}