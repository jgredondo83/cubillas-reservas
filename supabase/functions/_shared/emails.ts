// _shared/emails.ts
// Helper Brevo API REST + plantillas HTML para emails transaccionales.
// REGLA DE ORO: enviarEmailBrevo nunca lanza excepción. Siempre devuelve {ok, error?}.

export interface BrevoEmailParams {
  to: { email: string; name?: string }
  subject: string
  htmlContent: string
}

export async function enviarEmailBrevo(
  params: BrevoEmailParams,
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = Deno.env.get('BREVO_API_KEY')
  if (!apiKey) {
    console.warn('BREVO_API_KEY no configurada, email no enviado')
    return { ok: false, error: 'BREVO_API_KEY no configurada' }
  }
  const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL') ?? 'info@doyou.co.th'
  const senderName = Deno.env.get('BREVO_SENDER_NAME') ?? 'Reservas Parque del Cubillas'
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        to: [params.to],
        subject: params.subject,
        htmlContent: params.htmlContent,
      }),
    })
    if (!response.ok) {
      const errText = await response.text()
      console.error('Error Brevo:', response.status, errText)
      return { ok: false, error: `Brevo error ${response.status}` }
    }
    return { ok: true }
  } catch (err) {
    console.error('Excepción Brevo:', err)
    return { ok: false, error: String(err) }
  }
}

// ---------------------------------------------------------------------------
// Helpers internos de plantillas
// ---------------------------------------------------------------------------

function htmlBase(titulo: string, contenido: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${titulo}</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;border:1px solid #e2e8f0;">
        <tr>
          <td style="background-color:#0d9488;padding:24px 32px;text-align:center;border-radius:8px 8px 0 0;">
            <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.2px;">Reservas Parque del Cubillas</p>
          </td>
        </tr>
        ${contenido}
        <tr>
          <td style="background-color:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;border-radius:0 0 8px 8px;">
            <p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">Este es un mensaje automático. Por favor, no respondas a este email.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function filaTabla(etiqueta: string, valor: string, fondo: string): string {
  return `<tr style="background-color:${fondo};">
  <td style="padding:11px 16px;font-size:13px;color:#64748b;border-top:1px solid #e2e8f0;white-space:nowrap;">${etiqueta}</td>
  <td style="padding:11px 16px;font-size:14px;color:#0f172a;font-weight:500;border-top:1px solid #e2e8f0;">${valor}</td>
</tr>`
}

function botonCTA(url: string, texto: string): string {
  return `<table cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0 0;">
  <tr>
    <td style="border-radius:8px;background-color:#0d9488;">
      <a href="${url}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">${texto}</a>
    </td>
  </tr>
</table>`
}

function formatoHorario(horaInicio: string, horaFin: string, cruzaMedianoche: boolean): string {
  return cruzaMedianoche
    ? `${horaInicio} – ${horaFin} <span style="color:#64748b;font-size:12px;">(termina al día siguiente)</span>`
    : `${horaInicio} – ${horaFin}`
}

function formatoContacto(datosContacto: string): string {
  if (!datosContacto) return ''
  const escapado = datosContacto.replace(/\n/g, '<br>')
  return `<p style="margin:0 0 12px;color:#64748b;font-size:13px;line-height:1.6;">${escapado}</p>`
}

// ---------------------------------------------------------------------------
// Plantilla: Reserva Confirmada
// ---------------------------------------------------------------------------

export interface PlantillaConfirmadaParams {
  nombreVecino: string
  nombreRecurso: string
  fechaLarga: string
  horaInicio: string
  horaFin: string
  cruzaMedianoche: boolean
  estado: string
  urlMisReservas: string
  costeEuros?: number
  fianzaEuros?: number
  datosContacto: string
}

export function plantillaReservaConfirmada(p: PlantillaConfirmadaParams): string {
  const esPendientePago = p.estado === 'pendiente_pago'
  const estadoTexto = esPendientePago ? 'Pendiente de pago' : p.estado === 'pagado' ? 'Pagado' : 'Confirmada'
  const estadoColor = esPendientePago ? '#92400e' : '#065f46'
  const estadoBg = esPendientePago ? '#fef3c7' : '#d1fae5'

  const titulo = esPendientePago
    ? `Reserva pendiente de pago — ${p.nombreRecurso}`
    : `¡Reserva confirmada! — ${p.nombreRecurso}`

  const mensajePrincipal = esPendientePago
    ? `Tu reserva ha sido creada y está <strong>pendiente de pago</strong>. Debes abonar el importe en la administración antes del evento.`
    : `¡Tu reserva está confirmada! Te esperamos el <strong>${p.fechaLarga}</strong> en <strong>${p.nombreRecurso}</strong>.`

  const bloqueAmber = esPendientePago && (p.costeEuros ?? 0) > 0 ? `
<tr>
  <td style="padding:0 32px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td style="background-color:#fef3c7;border:1px solid #fcd34d;border-radius:6px;padding:16px;">
          <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#92400e;">&#9888; Pago pendiente</p>
          <p style="margin:0;font-size:14px;color:#92400e;line-height:1.6;">
            Debes abonar <strong>${p.costeEuros}€${(p.fianzaEuros ?? 0) > 0 ? ` + ${p.fianzaEuros}€ de fianza` : ''}</strong> en la administración antes del evento.
            Una vez registrado el pago por un administrador, el vigilante podrá entregarte las llaves.
          </p>
        </td>
      </tr>
    </table>
  </td>
</tr>` : ''

  const contenido = `
<tr>
  <td style="padding:32px 32px 24px;">
    <h1 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#0f172a;">${titulo}</h1>
    <p style="margin:0 0 20px;color:#475569;font-size:15px;">Hola <strong>${p.nombreVecino}</strong>,</p>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">${mensajePrincipal}</p>

    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
      <tr style="background-color:#f1f5f9;">
        <td style="padding:10px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.6px;">Campo</td>
        <td style="padding:10px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.6px;">Detalle</td>
      </tr>
      ${filaTabla('Instalación', p.nombreRecurso, '#ffffff')}
      ${filaTabla('Fecha', p.fechaLarga, '#f8fafc')}
      ${filaTabla('Horario', formatoHorario(p.horaInicio, p.horaFin, p.cruzaMedianoche), '#ffffff')}
      <tr style="background-color:#f8fafc;">
        <td style="padding:11px 16px;font-size:13px;color:#64748b;border-top:1px solid #e2e8f0;">Estado</td>
        <td style="padding:11px 16px;border-top:1px solid #e2e8f0;">
          <span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:13px;font-weight:600;background-color:${estadoBg};color:${estadoColor};">${estadoTexto}</span>
        </td>
      </tr>
    </table>

    ${botonCTA(p.urlMisReservas, 'Ver mis reservas')}
  </td>
</tr>
${bloqueAmber}
<tr>
  <td style="padding:0 32px 28px;">
    ${formatoContacto(p.datosContacto)}
  </td>
</tr>`

  return htmlBase(titulo, contenido)
}

// ---------------------------------------------------------------------------
// Plantilla: Recordatorio 1h antes
// ---------------------------------------------------------------------------

export interface PlantillaRecordatorioParams {
  nombreVecino: string
  nombreRecurso: string
  fechaLarga: string
  horaInicio: string
  horaFin: string
  cruzaMedianoche: boolean
  urlMisReservas: string
  datosContacto: string
}

export function plantillaRecordatorioReserva(p: PlantillaRecordatorioParams): string {
  const titulo = `Recordatorio: reserva en ${p.nombreRecurso} en 1 hora`

  const contenido = `
<tr>
  <td style="padding:32px 32px 24px;">
    <h1 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#0f172a;">&#128337; Recordatorio de reserva</h1>
    <p style="margin:0 0 20px;color:#475569;font-size:15px;">Hola <strong>${p.nombreVecino}</strong>,</p>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
      En <strong>1 hora</strong> tienes reserva en <strong>${p.nombreRecurso}</strong>.
      No olvides presentarte en la <strong>caseta del vigilante</strong> para que confirme tu asistencia.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
      <tr style="background-color:#f1f5f9;">
        <td style="padding:10px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.6px;">Campo</td>
        <td style="padding:10px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.6px;">Detalle</td>
      </tr>
      ${filaTabla('Instalación', p.nombreRecurso, '#ffffff')}
      ${filaTabla('Fecha', p.fechaLarga, '#f8fafc')}
      ${filaTabla('Horario', formatoHorario(p.horaInicio, p.horaFin, p.cruzaMedianoche), '#ffffff')}
    </table>

    ${botonCTA(p.urlMisReservas, 'Ver mis reservas')}
  </td>
</tr>
<tr>
  <td style="padding:0 32px 28px;">
    ${formatoContacto(p.datosContacto)}
  </td>
</tr>`

  return htmlBase(titulo, contenido)
}

// ---------------------------------------------------------------------------
// Plantilla: Reserva Cancelada (por otro, no por el propio vecino)
// ---------------------------------------------------------------------------

export interface PlantillaCanceladaParams {
  nombreVecino: string
  nombreRecurso: string
  fechaLarga: string
  horaInicio: string
  horaFin: string
  cruzaMedianoche: boolean
  motivoCancelacion: string
  canceladoPor: string // "el vigilante" o "la administración"
  datosContacto: string
}

export function plantillaReservaCancelada(p: PlantillaCanceladaParams): string {
  const titulo = `Reserva cancelada — ${p.nombreRecurso}`

  const contenido = `
<tr>
  <td style="padding:32px 32px 24px;">
    <h1 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#0f172a;">Reserva cancelada</h1>
    <p style="margin:0 0 20px;color:#475569;font-size:15px;">Hola <strong>${p.nombreVecino}</strong>,</p>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
      Tu reserva ha sido cancelada por <strong>${p.canceladoPor}</strong>.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
      <tr style="background-color:#f1f5f9;">
        <td style="padding:10px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.6px;">Campo</td>
        <td style="padding:10px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.6px;">Detalle</td>
      </tr>
      ${filaTabla('Instalación', p.nombreRecurso, '#ffffff')}
      ${filaTabla('Fecha', p.fechaLarga, '#f8fafc')}
      ${filaTabla('Horario', formatoHorario(p.horaInicio, p.horaFin, p.cruzaMedianoche), '#ffffff')}
      ${filaTabla('Motivo', p.motivoCancelacion || 'No especificado', '#f8fafc')}
      ${filaTabla('Cancelada por', p.canceladoPor, '#ffffff')}
    </table>

    <p style="margin:0 0 0;color:#374151;font-size:14px;line-height:1.6;">
      Si no entiendes esta decisión, contacta con la administración.
    </p>
  </td>
</tr>
<tr>
  <td style="padding:0 32px 28px;">
    ${formatoContacto(p.datosContacto)}
  </td>
</tr>`

  return htmlBase(titulo, contenido)
}

// ---------------------------------------------------------------------------
// Plantilla: Cuenta eliminada (RGPD Art. 17)
// ---------------------------------------------------------------------------

export interface PlantillaCuentaEliminadaParams {
  nombreVecino: string
  fechaEliminacion: string // formateada, ej: "22 de abril de 2026"
  datosContactoAdmin: string
}

export function plantillaCuentaEliminada(p: PlantillaCuentaEliminadaParams): string {
  const titulo = 'Tu cuenta ha sido eliminada'

  const contenido = `
<tr>
  <td style="padding:32px 32px 24px;">
    <h1 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#0f172a;">Cuenta eliminada</h1>
    <p style="margin:0 0 20px;color:#475569;font-size:15px;">Hola <strong>${p.nombreVecino}</strong>,</p>
    <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
      Confirmamos que tu cuenta en <strong>Reservas Parque del Cubillas</strong> ha sido eliminada el <strong>${p.fechaEliminacion}</strong>.
    </p>
    <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
      Todos tus datos personales han sido borrados de forma permanente de acuerdo con el Reglamento General de Protección de Datos (RGPD Art. 17).
    </p>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
      Las reservas pasadas en las que participaste se conservan de forma anónima únicamente con fines históricos y de gestión de la instalación.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f1f5f9;border-radius:6px;padding:16px;margin-bottom:24px;">
      <tr>
        <td>
          <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">
            Si crees que esta eliminación ha sido un error o tienes alguna pregunta, contacta con la administración de la comunidad.
          </p>
        </td>
      </tr>
    </table>
  </td>
</tr>
<tr>
  <td style="padding:0 32px 28px;">
    ${formatoContacto(p.datosContactoAdmin)}
  </td>
</tr>`

  return htmlBase(titulo, contenido)
}
