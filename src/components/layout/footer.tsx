// Footer component
'use client'

export function Footer() {
  return (
    <footer className="bg-rfl-navy text-white py-4">
      <div className="container mx-auto px-4 text-center">
        <p>&copy; {new Date().getFullYear()} My Fitness League</p>
      </div>
    </footer>
  )
}

