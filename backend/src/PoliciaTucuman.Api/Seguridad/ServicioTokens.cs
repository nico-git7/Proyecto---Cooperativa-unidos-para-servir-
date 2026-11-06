using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using PoliciaTucuman.Domain.Entidades;

namespace PoliciaTucuman.Api.Seguridad;

public sealed class ServicioTokens(IOptions<OpcionesJwt> opciones, TimeProvider reloj)
{
    private readonly OpcionesJwt _opciones = opciones.Value;

    public (string Token, DateTimeOffset Vence) Emitir(Usuario usuario, Personal personal)
    {
        var ahora = reloj.GetUtcNow();
        var vence = ahora.AddHours(_opciones.DuracionHoras);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, usuario.Id.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
            new(ClaimTypes.Name, personal.NombreCompleto),
            new(ClaimTypes.Role, usuario.Rol.ToString()),
            new(Claims.Legajo, personal.Legajo),
            new(Claims.PersonalId, personal.Id.ToString()),
            new(Claims.DependenciaId, personal.DependenciaId.ToString()),
        };

        var credenciales = new SigningCredentials(ClaveDeFirma(_opciones.Clave), SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            _opciones.Emisor, _opciones.Audiencia, claims,
            notBefore: ahora.UtcDateTime, expires: vence.UtcDateTime, signingCredentials: credenciales);

        return (new JwtSecurityTokenHandler().WriteToken(token), vence);
    }

    public static SymmetricSecurityKey ClaveDeFirma(string clave)
    {
        if (string.IsNullOrWhiteSpace(clave) || clave.Length < 32)
            throw new InvalidOperationException("Jwt:Clave debe tener al menos 32 caracteres.");
        return new SymmetricSecurityKey(Encoding.UTF8.GetBytes(clave));
    }
}
