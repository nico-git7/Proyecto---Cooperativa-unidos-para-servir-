# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS compilacion
WORKDIR /src

# Primero solo los proyectos: la restauración de paquetes queda en caché mientras no cambien.
COPY Directory.Build.props PoliciaTucuman.sln ./
COPY src/PoliciaTucuman.Domain/PoliciaTucuman.Domain.csproj src/PoliciaTucuman.Domain/
COPY src/PoliciaTucuman.Infrastructure/PoliciaTucuman.Infrastructure.csproj src/PoliciaTucuman.Infrastructure/
COPY src/PoliciaTucuman.Api/PoliciaTucuman.Api.csproj src/PoliciaTucuman.Api/
RUN dotnet restore src/PoliciaTucuman.Api/PoliciaTucuman.Api.csproj

COPY src/ src/
RUN dotnet publish src/PoliciaTucuman.Api/PoliciaTucuman.Api.csproj -c Release -o /app --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# La imagen base ya trae tzdata y el usuario sin privilegios "app".
RUN mkdir -p /data/adjuntos /data/claves && chown -R app:app /data

# La imagen ya escucha en 8080 (ASPNETCORE_HTTP_PORTS).
ENV ASPNETCORE_ENVIRONMENT=Production \
    TZ=America/Argentina/Tucuman \
    Almacenamiento__Ruta=/data/adjuntos \
    DataProtection__Ruta=/data/claves

COPY --from=compilacion /app .

USER app
EXPOSE 8080

ENTRYPOINT ["dotnet", "PoliciaTucuman.Api.dll"]
