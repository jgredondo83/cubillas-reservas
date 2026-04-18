export default function Privacidad() {
  return (
    <main className="min-h-screen bg-white py-10 px-4">
      <article className="max-w-2xl mx-auto prose prose-sm prose-gray">
        <h1 className="text-2xl font-bold text-teal-700 mb-6">Política de Privacidad</h1>

        <p className="text-sm text-gray-500 mb-6">
          Última actualización: abril de 2026
        </p>

        <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-2">1. Responsable del tratamiento</h2>
        <p className="text-gray-700 leading-relaxed">
          Comunidad de Propietarios Parque del Cubillas.
          <br />
          Contacto: <a href="mailto:comunidadcubillas@gmail.com" className="text-teal-600 underline">comunidadcubillas@gmail.com</a>
        </p>

        <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-2">2. Datos que tratamos</h2>
        <ul className="list-disc pl-5 text-gray-700 space-y-1">
          <li>Nombre y apellidos</li>
          <li>Dirección de email</li>
          <li>Teléfono (opcional)</li>
          <li>Alias público (opcional)</li>
          <li>Vivienda asociada</li>
          <li>Historial de reservas de instalaciones</li>
        </ul>

        <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-2">3. Finalidad</h2>
        <p className="text-gray-700 leading-relaxed">
          Exclusivamente la gestión de reservas de instalaciones comunitarias (pistas de pádel, tenis y club social).
          No se utilizan los datos con fines comerciales ni publicitarios.
        </p>

        <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-2">4. Base legal</h2>
        <p className="text-gray-700 leading-relaxed">
          Consentimiento explícito del usuario al registrarse e interés legítimo de la comunidad para la gestión de sus instalaciones.
        </p>

        <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-2">5. Conservación de datos</h2>
        <p className="text-gray-700 leading-relaxed">
          Los datos se conservan mientras el usuario sea vecino activo de la comunidad. Al darse de baja, se mantienen durante 1 año y luego se eliminan definitivamente.
        </p>

        <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-2">6. Destinatarios</h2>
        <p className="text-gray-700 leading-relaxed">
          Los datos se almacenan en <strong>Supabase</strong> (infraestructura en la Unión Europea, región Frankfurt). No se ceden datos a terceros salvo obligación legal.
        </p>

        <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-2">7. Derechos</h2>
        <p className="text-gray-700 leading-relaxed">
          Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, portabilidad y limitación del tratamiento escribiendo a{' '}
          <a href="mailto:comunidadcubillas@gmail.com" className="text-teal-600 underline">comunidadcubillas@gmail.com</a>.
        </p>
        <p className="text-gray-700 leading-relaxed">
          También puedes presentar una reclamación ante la{' '}
          <strong>Agencia Española de Protección de Datos (AEPD)</strong>.
        </p>

        <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-2">8. Cookies</h2>
        <p className="text-gray-700 leading-relaxed">
          Esta aplicación solo utiliza cookies técnicas necesarias para el funcionamiento de la autenticación. No se utilizan cookies de seguimiento ni publicitarias.
        </p>
      </article>
    </main>
  )
}
