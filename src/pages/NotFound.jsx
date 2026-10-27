import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { EmptyState } from '../components/ui/States'

export default function NotFound() {
  return (
    <div className="card my-8 p-8">
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="The page you’re looking for doesn’t exist on the HydroSync dashboard."
        action={
          <Link to="/" className="btn-primary">
            Back to Overview
          </Link>
        }
      />
    </div>
  )
}
