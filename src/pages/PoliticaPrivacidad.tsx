import { Link } from 'react-router-dom'

export default function PoliticaPrivacidad() {
  return (
    <main className="min-h-screen bg-white py-10 px-4">
      <article className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link to="/" className="text-sm text-teal-600">← Volver</Link>
          <h1 className="text-2xl font-bold text-teal-700 mt-3 mb-1">Política de Privacidad</h1>
          <p className="text-sm text-gray-400">Última actualización: abril de 2026</p>
        </div>

        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="font-semibold text-gray-800 text-base mb-2">1. Responsable del tratamiento</h2>
            <p>
              <strong>Comunidad de Propietarios Parque del Cubillas</strong><br />
              Contacto: <a href="mailto:comunidadcubillas@gmail.com" className="text-teal-600 underline">comunidadcubillas@gmail.com</a>
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-800 text-base mb-2">2. Datos que tratamos</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Nombre, apellidos y alias público (opcional)</li>
              <li>Dirección de correo electrónico</li>
              <li>Teléfono de contacto</li>
              <li>Vivienda asociada dentro de la comunidad</li>
              <li>Historial de reservas de instalaciones comunes</li>
              <li>Nivel de pádel autoevaluado (opcional)</li>
              <li>Registros de incidencias (no presentados, bloqueos)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-800 text-base mb-2">3. Finalidad y base legal</h2>
            <p>
              Los datos se tratan exclusivamente para la gestión de reservas de instalaciones comunitarias (pistas de pádel, tenis y club social), incluyendo el control de acceso, la comunicación con el vecino sobre su reserva y el cumplimiento de las normas de uso aprobadas por la comunidad.
            </p>
            <p className="mt-2">
              La base legal es el <strong>interés legítimo</strong> de la comunidad de propietarios en gestionar el uso ordenado de sus instalaciones (art. 6.1.f RGPD).
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-800 text-base mb-2">4. Conservación de los datos</h2>
            <p>
              Los datos se conservan mientras la cuenta esté activa. Tras la eliminación de la cuenta, los datos personales identificativos se borran de forma permanente. Las reservas pasadas se conservan de forma <strong>anónima</strong> (sin vinculación al usuario) únicamente con fines históricos y de gestión.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-800 text-base mb-2">5. Destinatarios</h2>
            <p>
              Los datos no se ceden a terceros. Se utilizan los siguientes proveedores de servicios técnicos, que actúan como encargados del tratamiento:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Supabase Inc.</strong> — almacenamiento de datos y autenticación (servidores en la UE)</li>
              <li><strong>Brevo (Sendinblue SAS)</strong> — envío de correos transaccionales</li>
              <li><strong>Vercel Inc.</strong> — alojamiento de la aplicación web</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-800 text-base mb-2">6. Tus derechos (RGPD)</h2>
            <p className="mb-2">Puedes ejercer en cualquier momento los siguientes derechos:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Acceso y portabilidad (Art. 15 y 20)</strong>: descarga todos tus datos desde la sección "Mis datos" de tu perfil.</li>
              <li><strong>Rectificación (Art. 16)</strong>: edita tu nombre, apellidos, alias y teléfono directamente desde tu perfil.</li>
              <li><strong>Supresión / derecho al olvido (Art. 17)</strong>: elimina tu cuenta desde la "Zona de peligro" de tu perfil.</li>
              <li><strong>Limitación y oposición (Art. 18 y 21)</strong>: contacta con la administración.</li>
            </ul>
            <p className="mt-2">
              También puedes presentar una reclamación ante la <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" className="text-teal-600 underline">Agencia Española de Protección de Datos (AEPD)</a>.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-800 text-base mb-2">7. Contacto</h2>
            <p>
              Para cualquier consulta sobre privacidad: <a href="mailto:comunidadcubillas@gmail.com" className="text-teal-600 underline">comunidadcubillas@gmail.com</a>
            </p>
          </section>

        </div>

        <div className="mt-10 pt-6 border-t border-gray-100 flex gap-4 text-xs text-gray-400">
          <Link to="/aviso-legal" className="hover:text-gray-600">Aviso legal</Link>
          <Link to="/" className="hover:text-gray-600">Inicio</Link>
        </div>
      </article>
    </main>
  )
}
