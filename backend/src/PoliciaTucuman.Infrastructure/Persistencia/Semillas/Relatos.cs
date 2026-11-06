using PoliciaTucuman.Domain.Enums;

namespace PoliciaTucuman.Infrastructure.Persistencia.Semillas;

/// <summary>Relatos de ejemplo para los datos de demostración.</summary>
internal static class Relatos
{
    private static readonly string[] Celulares = ["Samsung Galaxy A54", "Motorola Moto G84", "iPhone 13", "Xiaomi Redmi Note 12", "Samsung Galaxy A34", "Motorola Edge 40"];
    private static readonly string[] Motos = ["Honda Wave 110", "Motomel Blitz 110", "Gilera Smash 110", "Honda CG Titan 150", "Corven Energy 110", "Yamaha YBR 125"];
    private static readonly string[] Autos = ["Volkswagen Gol Trend", "Chevrolet Onix", "Fiat Cronos", "Toyota Etios", "Renault Sandero", "Peugeot 208"];
    private static readonly string[] Colores = ["negro", "blanco", "gris", "rojo", "azul", "plateado"];

    public static string? Bien(TipoDelito tipo, Random r)
    {
        string Celular() => $"Teléfono celular {Celulares[r.Next(Celulares.Length)]}, color {Colores[r.Next(Colores.Length)]}";
        string Dominio(bool moto) => moto
            ? $"A{r.Next(100, 999)}{(char)('A' + r.Next(26))}{(char)('A' + r.Next(26))}{(char)('A' + r.Next(26))}"
            : $"A{(char)('A' + r.Next(26))}{r.Next(100, 999)}{(char)('A' + r.Next(26))}{(char)('A' + r.Next(26))}";

        return tipo switch
        {
            TipoDelito.Hurto => r.Next(4) switch
            {
                0 => Celular(),
                1 => $"Bicicleta rodado {(r.Next(2) == 0 ? 29 : 26)}, color {Colores[r.Next(Colores.Length)]}",
                2 => $"Billetera con documentación personal, tarjetas y ${r.Next(15, 90)}.000 en efectivo",
                _ => "Garrafa de 10 kg y herramientas de jardín",
            },
            TipoDelito.Robo => r.Next(3) switch
            {
                0 => Celular(),
                1 => $"Mochila con notebook Lenovo, documentación y ${r.Next(10, 60)}.000 en efectivo",
                _ => $"{Celular()} y cartera con documentación personal",
            },
            TipoDelito.RoboMotocicleta => $"Motocicleta {Motos[r.Next(Motos.Length)]}, color {Colores[r.Next(Colores.Length)]}, dominio {Dominio(true)}",
            TipoDelito.RoboAutomotor => $"Automóvil {Autos[r.Next(Autos.Length)]}, color {Colores[r.Next(Colores.Length)]}, dominio {Dominio(false)}",
            TipoDelito.EstafaVirtual => $"Transferencias por un total de ${r.Next(80, 950)}.000",
            TipoDelito.Estafa => $"${r.Next(50, 600)}.000 en efectivo",
            TipoDelito.ExtravioDocumentacion => r.Next(2) == 0 ? "DNI y licencia de conducir" : "DNI, tarjeta verde y cédula del automotor",
            TipoDelito.Danos => r.Next(2) == 0 ? "Luneta y espejo retrovisor del vehículo" : "Portón de ingreso y medidor de luz",
            _ => null,
        };
    }

    public static string Generar(TipoDelito tipo, string lugar, DateTimeOffset hora, string? bien, Random r)
    {
        var horario = $"{hora:HH:mm}";
        return tipo switch
        {
            TipoDelito.Hurto =>
                $"Siendo aproximadamente las {horario} hs, en {lugar}, constaté la falta de mis pertenencias que había dejado " +
                $"momentáneamente sin vigilancia. No observé a la persona que se las llevó. Elementos faltantes: {bien}.",
            TipoDelito.Robo => r.Next(2) == 0
                ? $"Siendo las {horario} hs aproximadamente, mientras caminaba por {lugar}, fui abordado por dos sujetos que se " +
                  $"desplazaban en una motocicleta. Uno de ellos descendió y me exigió la entrega de mis pertenencias. Se llevaron: {bien}. " +
                  "Se dieron a la fuga en dirección desconocida."
                : $"A las {horario} hs, al llegar a mi domicilio en {lugar}, un hombre me interceptó y mediante intimidación me sustrajo " +
                  $"{bien}. Vestía campera oscura y gorra. Huyó corriendo.",
            TipoDelito.RoboMotocicleta =>
                $"Dejé estacionada mi motocicleta frente a {lugar} cerca de las {horario} hs, asegurada con traba. Al regresar, " +
                $"aproximadamente una hora después, ya no se encontraba. Datos del rodado: {bien}. Hay cámaras en un comercio cercano.",
            TipoDelito.RoboAutomotor =>
                $"Estacioné el vehículo en {lugar} alrededor de las {horario} hs. Al volver no estaba en el lugar. " +
                $"Datos del rodado: {bien}. Cuenta con seguro y rastreo satelital que fue informado a la compañía.",
            TipoDelito.EstafaVirtual =>
                "Recibí un mensaje de WhatsApp de un número desconocido que se hizo pasar por un familiar y me pidió dinero por una urgencia. " +
                $"Realicé transferencias a una cuenta que me indicaron. Monto: {bien}. Luego dejó de responder y comprobé que era un engaño.",
            TipoDelito.Estafa =>
                $"Entregué {bien} a una persona que ofrecía la venta de un vehículo por redes sociales. Nos encontramos en {lugar}. " +
                "Luego de recibir la seña no volvió a comunicarse y el número dejó de estar disponible.",
            TipoDelito.ExtravioDocumentacion =>
                $"En el día de la fecha, en inmediaciones de {lugar}, extravié la siguiente documentación: {bien}. " +
                "Realizo la presente a los fines de tramitar los duplicados correspondientes.",
            TipoDelito.Amenazas =>
                $"Un vecino de {lugar} me amenazó verbalmente a las {horario} hs, manifestando que me iba a hacer daño. " +
                "No es la primera vez que ocurre. Hay testigos del hecho.",
            TipoDelito.Danos =>
                $"Siendo las {horario} hs constaté daños en {bien?.ToLowerInvariant() ?? "mi propiedad"}, en {lugar}. " +
                "Desconozco quién los produjo. Un vecino escuchó ruidos durante la noche.",
            TipoDelito.Lesiones =>
                $"Fui agredido físicamente a la salida de un local en {lugar}, alrededor de las {horario} hs, por una persona que no conozco. " +
                "Recibí golpes en el rostro y fui atendido en el centro de salud más cercano.",
            TipoDelito.ViolenciaFamiliar =>
                "Mi expareja se presentó en mi domicilio y me agredió verbalmente, profiriendo insultos y amenazas delante de mis hijos. " +
                "Solicito medidas de protección.",
            _ =>
                $"Siendo las {horario} hs, en {lugar}, ocurrió el hecho que motiva la presente. Solicito la intervención policial correspondiente.",
        };
    }
}
