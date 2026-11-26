FROM eclipse-temurin:21-jre-jammy@sha256:a8bff88f760e87e0c8844f8461f807c203fd5e8f78c951c843024647e965eaf5

WORKDIR /app
COPY target/fieldops-*.jar /app/fieldops.jar

USER 10001:10001
EXPOSE 8090
CMD ["java", "-jar", "/app/fieldops.jar"]
