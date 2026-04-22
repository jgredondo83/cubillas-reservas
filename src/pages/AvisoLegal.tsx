import { Link } from 'react-router-dom'

export default function AvisoLegal() {
  return (
    <main className="min-h-screen bg-white py-10 px-4">
      <article className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link to="/" className="text-sm text-teal-600">← Volver</Link>
          <h1 className="text-2xl font-bold text-teal-700 mt-3 mb-1">Aviso Legal</h1>
          <p className="text-sm text-gray-400">Última actualización: abril de 2026</p>
        </div>

        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="font-semibold text-gray-800 text-base mb-2">1. Titular del sitio</h2>
            <p>
              <strong>Comunidad de Propietarios Parque del Cubillas</strong><br />
              Contacto: <a href="mailto:comunidadcubillas@gmail.com" className="text-teal-600 underline">comunidadcubillas@gmail.com</a>
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-800 text-base mb-2">2. Objeto y ámbito de aplicación</h2>
            <p>
              Esta aplicación web es una herramienta interna de la Comunidad de Propietarios Parque del Cubillas para la gestión de reservas de instalaciones comunes. Su uso está restringido a vecinos y personal autorizado de la comunidad.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-800 text-base mb-2">3. Condiciones de uso</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>El acceso está limitado a vecinos con cuenta activa en el sistema.</li>
              <li>Cada usuario es responsable de la veracidad de los datos que proporciona.</li>
              <li>Queda prohibido el uso de la aplicación para fines distintos a la gestión de reservas.</li>
              <li>El incumplimiento de las normas de uso puede derivar en la suspensión temporal o permanente de la cuenta.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-800 text-base mb-2">4. Propiedad intelectual</h2>
            <p>
              El software de gestión de reservas ha sido desarrollado por encargo de la comunidad. Los textos, logotipos y contenidos propios de la comunidad son propiedad de la Comunidad de Propietarios Parque del Cubillas.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-800 text-base mb-2">5. Responsabilidad</h2>
            <p>
              La comunidad no se responsabiliza de posibles interrupciones del servicio por causas técnicas ajenas a su control. El sistema de reservas es una herramienta de gestión y no sustituye a las normas de uso de las instalaciones aprobadas en junta.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-800 text-base mb-2">6. Ley aplicable</h2>
            <p>
              Este aviso legal se rige por la legislación española. Para cualquier controversia, las partes se someten a los juzgados y tribunales del domicilio del responsable del tratamiento.
            </p>
          </section>

        </div>

        <div className="mt-10 pt-6 border-t border-gray-100 flex gap-4 text-xs text-gray-400">
          <Link to="/politica-privacidad" className="hover:text-gray-600">Política de privacidad</Link>
          <Link to="/" className="hover:text-gray-600">Inicio</Link>
        </div>
      </article>
    </main>
  )
}
