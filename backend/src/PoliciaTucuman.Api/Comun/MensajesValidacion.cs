using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc.ModelBinding.Metadata;

namespace PoliciaTucuman.Api.Comun;

/// <summary>Mensajes por defecto en castellano para los atributos de validación que no definen uno propio.</summary>
public sealed class MensajesValidacion : IValidationMetadataProvider
{
    public void CreateValidationMetadata(ValidationMetadataProviderContext context)
    {
        foreach (var atributo in context.ValidationMetadata.ValidatorMetadata.OfType<ValidationAttribute>())
        {
            if (!string.IsNullOrEmpty(atributo.ErrorMessage) || atributo.ErrorMessageResourceName is not null)
                continue;

            atributo.ErrorMessage = atributo switch
            {
                RequiredAttribute => "Este dato es obligatorio.",
                StringLengthAttribute { MinimumLength: > 0 } => "Debe tener entre {2} y {1} caracteres.",
                StringLengthAttribute => "Admite hasta {1} caracteres.",
                RangeAttribute => "El valor debe estar entre {1} y {2}.",
                EmailAddressAttribute => "El correo electrónico no es válido.",
                RegularExpressionAttribute => "El formato no es válido.",
                _ => atributo.ErrorMessage,
            };
        }
    }
}
