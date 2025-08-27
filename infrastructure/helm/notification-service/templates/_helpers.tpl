{{/*
Expand the name of the chart.
*/}}
{{- define "notification-service.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "notification-service.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "notification-service.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "notification-service.labels" -}}
helm.sh/chart: {{ include "notification-service.chart" . }}
{{ include "notification-service.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: serenity-platform
{{- end }}

{{/*
Selector labels
*/}}
{{- define "notification-service.selectorLabels" -}}
app.kubernetes.io/name: {{ include "notification-service.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "notification-service.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "notification-service.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Database URL construction
*/}}
{{- define "notification-service.databaseUrl" -}}
{{- if .Values.secrets.database.url }}
{{- .Values.secrets.database.url }}
{{- else }}
postgresql://{{ .Values.config.database.user | default "notifications_user" }}:{{ .Values.secrets.database.password }}@{{ .Values.config.database.host }}:{{ .Values.config.database.port }}/{{ .Values.config.database.name }}?sslmode={{ .Values.config.database.ssl }}
{{- end }}
{{- end }}

{{/*
Redis URL construction
*/}}
{{- define "notification-service.redisUrl" -}}
{{- if .Values.secrets.redis.url }}
{{- .Values.secrets.redis.url }}
{{- else }}
{{- if .Values.secrets.redis.password }}
redis://:{{ .Values.secrets.redis.password }}@{{ .Values.config.redis.host }}:{{ .Values.config.redis.port }}/{{ .Values.config.redis.db }}
{{- else }}
redis://{{ .Values.config.redis.host }}:{{ .Values.config.redis.port }}/{{ .Values.config.redis.db }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Image name construction
*/}}
{{- define "notification-service.image" -}}
{{- $registry := .Values.image.registry | default .Values.global.imageRegistry }}
{{- if $registry }}
{{- printf "%s/%s:%s" $registry .Values.image.repository (.Values.image.tag | default .Chart.AppVersion) }}
{{- else }}
{{- printf "%s:%s" .Values.image.repository (.Values.image.tag | default .Chart.AppVersion) }}
{{- end }}
{{- end }}

{{/*
Environment-specific configuration
*/}}
{{- define "notification-service.environment" -}}
{{- $env := .Values.global.environment | default "production" }}
{{- $env }}
{{- end }}

{{/*
Environment-specific values merge
*/}}
{{- define "notification-service.environmentValues" -}}
{{- $env := include "notification-service.environment" . }}
{{- $envValues := index .Values.environments $env | default dict }}
{{- $envValues }}
{{- end }}

{{/*
Resource requirements with environment overrides
*/}}
{{- define "notification-service.resources" -}}
{{- $env := include "notification-service.environment" . }}
{{- $envValues := index .Values.environments $env | default dict }}
{{- $resources := .Values.container.resources }}
{{- if $envValues.resources }}
{{- $resources = $envValues.resources }}
{{- end }}
{{- toYaml $resources }}
{{- end }}

{{/*
Replica count with environment overrides
*/}}
{{- define "notification-service.replicaCount" -}}
{{- $env := include "notification-service.environment" . }}
{{- $envValues := index .Values.environments $env | default dict }}
{{- $replicaCount := .Values.deployment.replicaCount }}
{{- if and $envValues.deployment $envValues.deployment.replicaCount }}
{{- $replicaCount = $envValues.deployment.replicaCount }}
{{- end }}
{{- $replicaCount }}
{{- end }}

{{/*
Autoscaling configuration with environment overrides
*/}}
{{- define "notification-service.autoscaling" -}}
{{- $env := include "notification-service.environment" . }}
{{- $envValues := index .Values.environments $env | default dict }}
{{- $autoscaling := .Values.autoscaling }}
{{- if $envValues.autoscaling }}
{{- $autoscaling = mergeOverwrite $autoscaling $envValues.autoscaling }}
{{- end }}
{{- toYaml $autoscaling }}
{{- end }}

{{/*
Security context
*/}}
{{- define "notification-service.securityContext" -}}
{{- toYaml .Values.deployment.securityContext }}
{{- end }}

{{/*
Pod security context
*/}}
{{- define "notification-service.podSecurityContext" -}}
{{- toYaml .Values.deployment.podSecurityContext }}
{{- end }}

{{/*
HIPAA compliant annotations
*/}}
{{- define "notification-service.hipaaAnnotations" -}}
hipaa.serenity.com/compliant: "true"
hipaa.serenity.com/phi-handling: "enabled"
hipaa.serenity.com/audit-logging: "enabled"
hipaa.serenity.com/encryption: "enabled"
compliance.serenity.com/framework: "hipaa"
{{- end }}

{{/*
Monitoring annotations
*/}}
{{- define "notification-service.monitoringAnnotations" -}}
{{- if .Values.monitoring.enabled }}
prometheus.io/scrape: "true"
prometheus.io/port: "{{ .Values.container.ports.metrics }}"
prometheus.io/path: "/metrics"
{{- if .Values.monitoring.prometheus.enabled }}
prometheus.io/enabled: "true"
{{- end }}
{{- end }}
{{- end }}

{{/*
Generate certificates
*/}}
{{- define "notification-service.gen-certs" -}}
{{- $altNames := list ( printf "%s.%s" (include "notification-service.name" .) .Release.Namespace ) ( printf "%s.%s.svc" (include "notification-service.name" .) .Release.Namespace ) -}}
{{- $ca := genCA "notification-service-ca" 365 -}}
{{- $cert := genSignedCert ( include "notification-service.name" . ) nil $altNames 365 $ca -}}
tls.crt: {{ $cert.Cert | b64enc }}
tls.key: {{ $cert.Key | b64enc }}
ca.crt: {{ $ca.Cert | b64enc }}
{{- end }}

{{/*
Validate required values
*/}}
{{- define "notification-service.validateValues" -}}
{{- if not .Values.secrets.jwt.secret }}
{{- fail "JWT secret is required. Please set secrets.jwt.secret" }}
{{- end }}
{{- if not .Values.secrets.database.password }}
{{- fail "Database password is required. Please set secrets.database.password" }}
{{- end }}
{{- if and .Values.config.redis.auth.enabled (not .Values.secrets.redis.password) }}
{{- fail "Redis password is required when Redis auth is enabled. Please set secrets.redis.password" }}
{{- end }}
{{- end }}

{{/*
Network policy selector labels
*/}}
{{- define "notification-service.networkPolicyLabels" -}}
app.kubernetes.io/name: {{ include "notification-service.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Volume mounts for containers
*/}}
{{- define "notification-service.volumeMounts" -}}
- name: tmp
  mountPath: /tmp
- name: logs
  mountPath: /app/logs
- name: cache
  mountPath: /app/cache
{{- if .Values.persistence.auditLogs.enabled }}
- name: audit-logs
  mountPath: /app/audit-logs
{{- end }}
{{- end }}

{{/*
Volumes for pods
*/}}
{{- define "notification-service.volumes" -}}
- name: tmp
  emptyDir: {}
- name: logs
  emptyDir: {}
- name: cache
  emptyDir:
    sizeLimit: 500Mi
{{- if .Values.persistence.auditLogs.enabled }}
- name: audit-logs
  persistentVolumeClaim:
    claimName: {{ include "notification-service.fullname" . }}-audit-logs
{{- end }}
{{- if .Values.logging.fluentBit.enabled }}
- name: fluent-bit-config
  configMap:
    name: {{ include "notification-service.fullname" . }}-fluent-bit-config
{{- end }}
{{- end }}

{{/*
Environment variables from config
*/}}
{{- define "notification-service.configEnv" -}}
- name: NODE_ENV
  value: {{ .Values.container.env.NODE_ENV | quote }}
- name: LOG_LEVEL
  value: {{ .Values.container.env.LOG_LEVEL | quote }}
- name: PORT
  value: {{ .Values.container.env.PORT | quote }}
- name: METRICS_PORT
  value: {{ .Values.container.env.METRICS_PORT | quote }}
- name: DATABASE_HOST
  value: {{ .Values.config.database.host | quote }}
- name: DATABASE_PORT
  value: {{ .Values.config.database.port | quote }}
- name: DATABASE_NAME
  value: {{ .Values.config.database.name | quote }}
- name: REDIS_HOST
  value: {{ .Values.config.redis.host | quote }}
- name: REDIS_PORT
  value: {{ .Values.config.redis.port | quote }}
- name: REDIS_DB
  value: {{ .Values.config.redis.db | quote }}
{{- end }}

{{/*
Environment variables from secrets
*/}}
{{- define "notification-service.secretEnv" -}}
- name: DATABASE_URL
  valueFrom:
    secretKeyRef:
      name: {{ include "notification-service.fullname" . }}-secrets
      key: database-url
- name: REDIS_URL
  valueFrom:
    secretKeyRef:
      name: {{ include "notification-service.fullname" . }}-secrets
      key: redis-url
- name: JWT_SECRET
  valueFrom:
    secretKeyRef:
      name: {{ include "notification-service.fullname" . }}-secrets
      key: jwt-secret
{{- end }}

{{/*
Ingress TLS configuration
*/}}
{{- define "notification-service.ingressTLS" -}}
{{- if .Values.ingress.tls }}
tls:
{{- range .Values.ingress.tls }}
  - hosts:
    {{- range .hosts }}
    - {{ . | quote }}
    {{- end }}
    secretName: {{ .secretName }}
{{- end }}
{{- end }}
{{- end }}