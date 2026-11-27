// Renders the gated ServiceLanding to a string for tests (ServiceLanding is a server component; the shell chrome is
// included, so this also proves the full page renders). Throws exactly what the component throws.
import { renderComponent } from "../content/render-helper.mjs"
export const ServiceLanding = ({ page, content }) => renderComponent("components/aeo/service-landing.tsx", "ServiceLanding", { page, content })
