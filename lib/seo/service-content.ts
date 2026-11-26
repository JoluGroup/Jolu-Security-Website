// DRAFT answer-first content for the seven core service pages, written from the AEO workbook briefs C01-C07
// ("Draft briefs, not published claims"). NOTHING here is approved or published:
//  - every page is still "unpublished" in lib/seo/page-records.ts and the evidence ledger is empty, so the publication
//    gate refuses all seven (see tests/seo/service-pages.test.mjs);
//  - the text describes what drives the budget, what buyers should ask for and what a site assessment should cover.
//    It states no price, rate, licence, qualification, response time, availability, coverage, client, year of operation,
//    guard number, supervision arrangement or guarantee about JOLU SECURITY;
//  - every scenario in the budget tables is hypothetical and is labelled so;
//  - plain ASCII only (lib/seo/text-policy.ts rejects anything else in rendered text).
// Publishing is a reviewable change: see docs/seo/release04-evidence-gated-inventory.md.
import type { ServiceSlug } from "@/lib/seo/page-models"
import type { ServiceContent } from "@/lib/seo/aeo-types"

/** How to start: the same three steps for every service, each worded for the service (no sentence is shared between pages). */
const quote = (subject: string, details: string, next: string): readonly string[] => [
  `Use the enquiry form on this site, call or message JOLU SECURITY, and describe ${subject}.`,
  details,
  next,
]

export const SERVICE_CONTENT: readonly ServiceContent[] = [
  {
    slug: "manned-guarding",
    briefId: "C01",
    status: "draft-not-approved",
    metaTitle: "Security Guard Services in Kenya",
    metaDescription: "What to ask any manned guarding provider and how to request a site assessment from JOLU SECURITY. What shapes the budget for guarding.",
    h1: "Manned Guarding",
    answer:
      "The price of manned guarding depends mainly on how many guard posts a site needs, the hours each post is covered, the level of supervision, the risk profile of the site and the equipment required. Because every property differs, a site assessment is the practical way to get a quotation that matches your situation.",
    budget: {
      caption: "How budget factors for manned guarding differ between two hypothetical sites",
      intro: "The budget for manned guarding typically depends on the number of security posts, required coverage hours and site-specific security requirements. The two scenarios below are invented to show how each factor moves the budget. They are not past work, client examples or quotations.",
      scenarioA: { label: "Scenario A: small office compound (hypothetical)", description: "One main entrance, low visitor traffic and cover needed during business hours only." },
      scenarioB: { label: "Scenario B: large mixed-use estate (hypothetical)", description: "Several gates, a long perimeter, heavy vehicle and visitor traffic and cover needed across day and night shifts." },
      rows: [
        { factor: "Number of posts", whyItMatters: "Each post that must always be staffed adds guards to the arrangement.", scenarioA: "One post at the entrance.", scenarioB: "Several posts at gates, the perimeter and key buildings." },
        { factor: "Hours and shift pattern", whyItMatters: "Longer cover needs more shifts and relief guards.", scenarioA: "Working hours on set days.", scenarioB: "Day and night shifts, including weekends and public holidays." },
        { factor: "Supervision and reporting", whyItMatters: "Supervisors, checks and written reports take time and people beyond the guards on post.", scenarioA: "A simple daily log kept at the post.", scenarioB: "Regular supervisory checks and structured incident reports." },
        { factor: "Site risk and layout", whyItMatters: "A larger or higher-risk site may need more posts, patrol points or specialist duties.", scenarioA: "Single building with a clear approach.", scenarioB: "Many buildings, blind corners and shared access roads." },
        { factor: "Equipment and uniforms", whyItMatters: "Radios, torches, access registers and weather gear are part of the arrangement.", scenarioA: "Basic equipment.", scenarioB: "Radios, vehicle checks and a visitor management process." },
      ],
      note: "No indicative figures are published here. The figure that applies to your site comes from a written quotation after a site assessment.",
    },
    scope: {
      purpose: [
        "Manned guarding places security personnel at the entrances and locations a site owner chooses, so that access is controlled and activity on the premises is observed by people on the ground.",
        "It suits residential estates, offices, shops, schools, construction sites and other premises where a human presence matters, and it is often combined with CCTV, alarms or fencing.",
      ],
      buyerRequirements: [
        "Ask for a written statement of duties for every post, so guards and managers share the same expectations.",
        "Ask how guards are supervised, how incidents are recorded and who you can call when something goes wrong.",
        "Ask what training and background checks the provider requires of guards, and ask to see the supporting documents.",
        "Ask what happens when a guard is absent, so that a post is not left empty.",
      ],
      assessmentSteps: [
        "Walk the site with the person responsible for it and note entrances, boundaries, blind spots and existing security measures.",
        "Agree the posts needed, the hours to be covered and any duties such as access registers or vehicle checks.",
        "Discuss supervision, reporting and how and when you want to be told about incidents.",
        "Set out the proposed arrangement in a written quotation for you to review.",
      ],
      inScope: [
        "Guarding of entrances, gates, reception areas and agreed areas of the site.",
        "Access control duties such as keeping a visitor register, as agreed.",
        "Written post instructions and incident reporting, as agreed.",
      ],
      toConfirm: [
        "Number of posts and the hours each is covered.",
        "Equipment that is supplied and who provides it.",
        "Supervision and reporting arrangements.",
        "Contract length, notice and review dates.",
      ],
      regulatory: [
        "Private security providers in Kenya operate under the Private Security Regulation Act, 2016, which created the Private Security Regulatory Authority (PSRA).",
        "Before you sign, ask any provider for current evidence of its authorisation and check it with the regulator.",
      ],
      quote: quote("the site, the entrances you want covered and the guarding you have in mind", "Tell us the address or area, the days and hours you need covered and who should be contacted to arrange a visit.", "The posts, hours and terms are then set out in a written quotation that you can compare with other providers."),
    },
    faqs: [
      { question: "What decides the price of a security guard arrangement?", answer: "The main drivers are the number of posts, the hours each post is covered, supervision and reporting, the risk and layout of the site, and equipment. Two sites of the same size can differ widely if one needs day and night cover and the other does not." },
      { question: "Should I choose a guard arrangement on price alone?", answer: "Compare what is included before comparing totals. Check posts, hours, supervision, absence cover and equipment line by line, because a lower figure can reflect a smaller scope rather than a better arrangement." },
      { question: "What is a post instruction, and why does it matter?", answer: "A post instruction is a written list of what a guard at a given post must do, such as checking visitors in, recording incidents and who to call. It keeps duties clear for the guard, the supervisor and your own staff." },
      { question: "How do I verify a guarding provider before I hire?", answer: "Ask for current authorisation documents and check them with the Private Security Regulatory Authority. Also ask for the provider's written procedures for supervision, incident reporting and covering an absent guard." },
      { question: "Can guarding be combined with CCTV or alarms?", answer: "Yes, many sites use guards together with cameras, alarms or fencing, so that people and equipment support one another. A site assessment can look at which combination suits the layout and the risks you face." },
    ],
  },
  {
    slug: "cctv-installation",
    briefId: "C02",
    status: "draft-not-approved",
    metaTitle: "CCTV Installation in Kenya",
    metaDescription: "How a CCTV installation is planned, the data protection questions to settle and how to request a site assessment. What affects the budget.",
    h1: "CCTV Installation",
    answer:
      "A CCTV installation starts with a site survey that decides where cameras are needed, what each must see and how recordings are stored and viewed. The budget depends on the number of cameras, the cabling, recording and storage and the maintenance. Recording people also brings data protection duties, which should be settled before installation.",
    budget: {
      caption: "How budget factors for CCTV installation differ between two hypothetical sites",
      intro: "The scenarios below are invented to show how each factor changes the scope of a CCTV project. They are not past installations, client examples or quotations.",
      scenarioA: { label: "Scenario A: single shop (hypothetical)", description: "One building, a few areas to cover and recordings viewed by the owner on one screen." },
      scenarioB: { label: "Scenario B: multi-building compound (hypothetical)", description: "Several buildings, an outdoor perimeter, long cable runs and several people who need to view recordings." },
      rows: [
        { factor: "Number and type of cameras", whyItMatters: "More areas to cover means more cameras, and outdoor or low-light areas need different models.", scenarioA: "A small number of indoor and entrance cameras.", scenarioB: "Many cameras, including outdoor and low-light positions." },
        { factor: "Cabling and mounting", whyItMatters: "Distance, building materials and height affect labour and materials.", scenarioA: "Short cable runs inside one building.", scenarioB: "Long runs between buildings and across open ground." },
        { factor: "Recording and storage", whyItMatters: "How long recordings must be kept and at what resolution sets storage needs.", scenarioA: "A single recorder with modest storage.", scenarioB: "Larger storage and a plan for backup and access control." },
        { factor: "Viewing and remote access", whyItMatters: "Who may view live or recorded footage, and from where, affects equipment and security settings.", scenarioA: "On-site viewing by the owner.", scenarioB: "Controlled access for several users, with a record of who views what." },
        { factor: "Maintenance and support", whyItMatters: "Cameras need cleaning, checks and repair if they are to keep recording usable images.", scenarioA: "Occasional checks as needed.", scenarioB: "A planned maintenance schedule agreed in writing." },
      ],
      note: "No indicative figures are published here. Equipment, support terms and the figure for your site are set out in a written quotation after a site survey.",
    },
    scope: {
      purpose: [
        "CCTV helps a site owner see what is happening at entrances, boundaries and sensitive areas, and keeps a recording that can be reviewed after an incident.",
        "It works well when cameras are placed for a stated purpose and the footage is managed responsibly.",
      ],
      buyerRequirements: [
        "Ask for a site survey and a written camera plan that shows what each camera is meant to see.",
        "Ask how long recordings are kept, who can view them and how access is controlled.",
        "Ask what maintenance, support and repair terms apply, and get them in writing.",
        "Ask what equipment will be used and whether replacement parts are available locally.",
      ],
      assessmentSteps: [
        "Survey the site to identify entrances, boundaries, lighting and the areas that matter most.",
        "Agree what each camera should see and where it can be mounted and cabled.",
        "Agree recording, storage and viewing arrangements, including who may see footage.",
        "Set out the proposed system in a written quotation, including support terms.",
      ],
      inScope: [
        "Supply and installation of CCTV cameras, cabling and recording equipment.",
        "Set-up of recording and viewing as agreed.",
        "A handover explaining how to view and export recordings.",
      ],
      toConfirm: [
        "Equipment brands and models.",
        "Storage duration and viewing access.",
        "Maintenance, support and repair terms.",
        "Installation timing and site access.",
      ],
      regulatory: [
        "Footage of identifiable people is personal data. The Data Protection Act, 2019 applies to how it is collected, stored, shared and deleted.",
        "Decide who is responsible for the footage, whether signs are needed, how long recordings are kept and whether your organisation needs to register with the Office of the Data Protection Commissioner.",
      ],
      quote: quote("the premises, the areas you want to see and any cameras you already have", "Tell us the address or area, how recordings will be used and who should be contacted to arrange a survey.", "The camera plan, recording arrangements and support terms are then set out in a written quotation that you can compare with other providers."),
    },
    faqs: [
      { question: "What happens in a CCTV site survey?", answer: "The surveyor looks at entrances, boundaries, lighting and cable routes, and asks what you want to be able to see. The result should be a camera plan showing the position and purpose of each camera." },
      { question: "How many cameras does a site need?", answer: "There is no standard number. It depends on the areas to be covered, the layout, lighting and what each view must show, so the camera plan from a survey is a better guide than a general rule." },
      { question: "Do I need to think about data protection when I install cameras?", answer: "Yes. Footage of identifiable people is personal data, so you should decide who controls it, how long it is kept, who may view it and whether signage or a filing with the data protection regulator is needed under Kenyan law." },
      { question: "Can I view the cameras from my phone?", answer: "Often yes, but remote viewing needs secure settings and a decision about who is allowed to see the footage. Ask how access is protected and how it is switched off when someone leaves your organisation." },
      { question: "What should a maintenance agreement cover?", answer: "It should say how often cameras and recorders are checked, what is repaired and who pays for parts, and how quickly you can expect a visit. Ask for these terms in writing before you agree." },
    ],
  },
  {
    slug: "electric-fencing",
    briefId: "C03",
    status: "draft-not-approved",
    metaTitle: "Electric Fence Installation in Kenya",
    metaDescription: "The safety points to settle with an electric fence installer and how to request a site assessment. What shapes the budget for a fence.",
    h1: "Electric Fencing",
    answer:
      "The budget for an electric fence depends mainly on the length of the perimeter, the number of strands, the terrain, the energiser, the gates and corners and ongoing maintenance. Safety matters as much as price. Ask how the system will be earthed, signed and checked. A site assessment gives you a quotation for your boundary.",
    budget: {
      caption: "How budget factors for electric fencing differ between two hypothetical properties",
      intro: "The scenarios below are invented to show how each factor changes the scope of a fencing project. They are not past installations, client examples or quotations.",
      scenarioA: { label: "Scenario A: small residential plot (hypothetical)", description: "A short, fairly flat boundary with one gate." },
      scenarioB: { label: "Scenario B: large commercial yard (hypothetical)", description: "A long boundary with slopes, several gates and a vehicle entrance." },
      rows: [
        { factor: "Perimeter length", whyItMatters: "Length drives the amount of wire, posts and labour.", scenarioA: "Short boundary.", scenarioB: "Long boundary." },
        { factor: "Number of strands", whyItMatters: "More strands mean more material and a different level of deterrence.", scenarioA: "Fewer strands.", scenarioB: "More strands on exposed sections." },
        { factor: "Terrain and corners", whyItMatters: "Slopes, rock, trees and many corners slow installation and need extra posts and fittings.", scenarioA: "Flat ground and few corners.", scenarioB: "Uneven ground, trees and many corners." },
        { factor: "Energiser and power", whyItMatters: "The energiser must suit the length of the fence, and the site needs a steady supply and a backup plan.", scenarioA: "One energiser of modest size.", scenarioB: "A larger energiser and a plan for power outages." },
        { factor: "Gates and maintenance", whyItMatters: "Gates need careful design, and vegetation, tension and earthing need regular checks.", scenarioA: "One pedestrian gate.", scenarioB: "Vehicle and pedestrian gates with a written maintenance plan." },
      ],
      note: "No indicative figures are published here. Equipment specifications and the figure for your boundary are set out in a written quotation after a site assessment.",
    },
    scope: {
      purpose: [
        "An electric fence marks and defends the boundary of a property. It is a physical and visible barrier meant to deter and delay unauthorised entry.",
        "It is usually combined with guards, cameras or alarms, because a fence by itself does not watch the boundary.",
      ],
      buyerRequirements: [
        "Ask how the installation will be earthed and what safety signs will be fitted.",
        "Ask what equipment and specifications will be used, and get them in writing.",
        "Ask how the fence is checked and maintained, and what vegetation control you are expected to do.",
        "Ask what happens during a power outage and how faults are reported.",
      ],
      assessmentSteps: [
        "Walk the boundary to measure the length, note the terrain, corners, gates and neighbouring properties.",
        "Agree the fence height, number of strands and where gates and warning signs are needed.",
        "Agree the power supply, energiser and any backup arrangement.",
        "Set out the proposed installation and maintenance in a written quotation.",
      ],
      inScope: [
        "Supply and installation of electric fencing along the agreed boundary.",
        "Energiser, earthing, gate arrangements and warning signs as agreed.",
        "A handover explaining how the system works and how to report faults.",
      ],
      toConfirm: [
        "Fence height, strands and materials.",
        "Energiser model and power arrangements.",
        "Maintenance and fault-reporting terms.",
        "Installation timing and site access.",
      ],
      regulatory: [
        "Electric fences carry a risk of harm if they are poorly designed, so safety is a core part of the job.",
        "Confirm which national and county requirements apply to your site, and ask the installer which standards the equipment and installation follow.",
        "Warning signs and the position of the fence relative to public land and neighbours should be settled before work starts.",
      ],
      quote: quote("the property, the boundary you want to protect and any fence already in place", "Tell us the address or area, the approximate length of the boundary and who should be contacted to arrange a walk-through.", "The fence design, safety measures and maintenance terms are then set out in a written quotation that you can compare with other providers."),
    },
    faqs: [
      { question: "What affects the price of an electric fence?", answer: "Perimeter length, the number of strands, terrain, the energiser, gates and corners, and maintenance all matter. A walk along the boundary is needed before anyone can give a firm figure for your property." },
      { question: "Is an electric fence safe?", answer: "A fence that is correctly designed, earthed and signed is intended to deter without causing serious harm, but poor design can be dangerous. Ask the installer how safety is handled and which standards are followed." },
      { question: "Does an electric fence work during a power cut?", answer: "Only if the system has a backup such as a battery. Ask what backup is included, how long it is expected to last and how you will know if the fence stops working." },
      { question: "What maintenance does an electric fence need?", answer: "Vegetation touching the wire, loose strands and damaged insulators can all reduce performance, so regular checks matter. Agree in writing who inspects the fence and how often." },
      { question: "Should I use a fence on its own?", answer: "A fence marks and delays but does not watch the boundary. Many properties combine it with guards, cameras or alarms, and a site assessment can look at which combination suits the layout." },
    ],
  },
  {
    slug: "events-security",
    briefId: "C05",
    status: "draft-not-approved",
    metaTitle: "Event Security Services in Kenya",
    metaDescription: "What to plan when hiring event security and how to request a site assessment from JOLU SECURITY. What shapes the budget for an event.",
    h1: "Events Security",
    answer:
      "To hire event security, tell the provider the event type, expected attendance, venue layout, entry points and timings. These decide how many personnel are needed and how access and crowd flow are managed. Because plans take time to prepare, ask for a site visit and a written quotation well before the date of your event.",
    budget: {
      caption: "How budget factors for event security differ between two hypothetical events",
      intro: "The scenarios below are invented to show how each factor changes the scope of event security. They are not past events, client examples or quotations.",
      scenarioA: { label: "Scenario A: private function (hypothetical)", description: "A single evening event with an invited guest list and one entrance." },
      scenarioB: { label: "Scenario B: public festival (hypothetical)", description: "A multi-day event with ticketed entry, several gates, vehicle parking and large crowds." },
      rows: [
        { factor: "Attendance and venue size", whyItMatters: "More people and more space need more personnel and more points of control.", scenarioA: "A small, contained venue.", scenarioB: "A large venue with several zones." },
        { factor: "Entry and access control", whyItMatters: "Checking invitations or tickets and managing queues takes staff at each entrance.", scenarioA: "One entrance and a guest list.", scenarioB: "Several gates, ticket checks and separate staff and VIP access." },
        { factor: "Crowd flow and parking", whyItMatters: "Moving people and vehicles safely needs planning and people on the ground.", scenarioA: "Limited parking and little queuing.", scenarioB: "Large parking areas and busy walkways." },
        { factor: "Duration and timings", whyItMatters: "Setup, event hours and pack-down all need cover.", scenarioA: "One evening.", scenarioB: "Several days including setup and pack-down." },
        { factor: "Liaison with organisers", whyItMatters: "Briefings, a named contact and a plan for incidents take preparation time.", scenarioA: "A short briefing before the event.", scenarioB: "Planning meetings, a briefing and a coordination plan with other contractors." },
      ],
      note: "No indicative figures are published here. The figure for your event comes from a written quotation after a site visit.",
    },
    scope: {
      purpose: [
        "Event security helps organisers manage who enters, how crowds move and how incidents are handled, so that guests and staff can focus on the event.",
        "The right scale depends on the type of event, the venue and the number of people expected.",
      ],
      buyerRequirements: [
        "Ask for a written plan covering entry points, crowd flow, staffing and how incidents are reported.",
        "Ask who will be your single point of contact before and during the event.",
        "Ask how the provider coordinates with your other contractors and the venue.",
        "Ask how late changes in guest numbers or timings are handled.",
      ],
      assessmentSteps: [
        "Discuss the event type, expected attendance, timings and any past issues.",
        "Visit the venue to look at entrances, exits, parking, stages and storage areas.",
        "Agree personnel numbers, positions and briefing arrangements.",
        "Set out the proposed arrangement in a written quotation for you to review.",
      ],
      inScope: [
        "Security personnel for public and private events.",
        "Entry and access control duties, as agreed.",
        "Briefing and a named contact for the organiser.",
      ],
      toConfirm: [
        "Number of personnel and positions.",
        "Setup and pack-down cover.",
        "Equipment such as radios.",
        "Notice period and changes to numbers.",
      ],
      regulatory: [
        "Public events may need permits or notification to county authorities and the police, depending on the venue and size.",
        "Check what applies with the relevant authorities. The organiser remains responsible for permits, and security arrangements should respect any conditions attached to them.",
        "Ask the security provider for current evidence of its authorisation to work at events, and check it with the regulator.",
      ],
      quote: quote("the event, the venue, the date and the number of guests you expect", "Tell us the timings, the entrances and any concerns, and who should be contacted to arrange a venue visit.", "The personnel, positions and briefing arrangements are then set out in a written quotation that you can compare with other providers."),
    },
    faqs: [
      { question: "How early should I contact an event security provider?", answer: "As early as you can, once you know the date, venue and rough numbers. Planning, a site visit and a written quotation all take time. The earlier you start, the more options you will have." },
      { question: "What do I need to tell the provider?", answer: "Give the event type, venue, date and timings, expected attendance, entry points, any VIP or high-profile guests and any concerns. The more precise the brief, the more accurate the plan and quotation will be." },
      { question: "How many security personnel does an event need?", answer: "There is no standard ratio. The number depends on attendance, venue layout, the number of entrances, the type of event and the risks. A site visit is a better basis than a general formula." },
      { question: "Who is responsible for permits?", answer: "The organiser is normally responsible for permits and notifications. Check requirements with the relevant authorities and make sure the security plan respects any conditions of the permit." },
      { question: "What happens if the guest list grows at the last minute?", answer: "Ask how the provider handles changes. Agree in writing the notice needed to increase personnel and how extra cover would be charged. That way you are not negotiating on the day." },
    ],
  },
  {
    slug: "k9-unit-services",
    briefId: "C06",
    status: "draft-not-approved",
    metaTitle: "Security Dog Services in Kenya",
    metaDescription: "When K9 security can help, what to ask a provider about handlers, dog welfare and insurance, and how to request a site assessment.",
    h1: "K9 Unit Services",
    answer:
      "K9 security pairs a dog with a handler as one part of a site's security arrangements. It can suit large or open sites, but it is not right for every property. Before you decide, ask a provider about handler qualifications, dog welfare standards, insurance and how the team fits with your other security measures.",
    budget: {
      caption: "How budget factors for K9 unit services differ between two hypothetical sites",
      intro: "The scenarios below are invented to show how each factor changes the scope of a K9 arrangement. They are not past work, client examples or quotations.",
      scenarioA: { label: "Scenario A: small warehouse (hypothetical)", description: "A modest site where a team is needed for a limited period." },
      scenarioB: { label: "Scenario B: large industrial site (hypothetical)", description: "A large, open site where teams are needed over longer periods." },
      rows: [
        { factor: "Number of teams", whyItMatters: "Each dog and handler pair is a team. More teams cost more to provide.", scenarioA: "One team.", scenarioB: "Several teams." },
        { factor: "Hours of cover", whyItMatters: "Longer cover needs relief arrangements so that dogs and handlers are properly rested.", scenarioA: "A limited period.", scenarioB: "Longer cover with relief teams." },
        { factor: "Site size and layout", whyItMatters: "Large, open or cluttered sites change how a team can be used.", scenarioA: "A contained site.", scenarioB: "A large site with open areas and buildings." },
        { factor: "Welfare and care", whyItMatters: "Housing, veterinary care, transport and rest are part of responsible dog care.", scenarioA: "Standard arrangements.", scenarioB: "Arrangements for longer deployments." },
        { factor: "Insurance and support", whyItMatters: "Cover for incidents and support staff form part of the arrangement.", scenarioA: "Standard terms.", scenarioB: "Terms agreed for a larger deployment." },
      ],
      note: "No indicative figures are published here. The figure for your site comes from a written quotation after a site assessment.",
    },
    scope: {
      purpose: [
        "A K9 team combines a handler and a dog as one part of a site's security arrangements, adding a deterrent and an additional way to cover open areas.",
        "It supports other measures such as guards and fencing and does not replace them.",
      ],
      buyerRequirements: [
        "Ask what training and qualifications handlers hold, and ask to see supporting documents.",
        "Ask how the welfare of the dogs is managed, including care, rest and veterinary support.",
        "Ask what insurance applies and what happens if a dog or handler is unavailable.",
        "Ask how the team will be briefed on your site rules and on dealing with members of the public.",
      ],
      assessmentSteps: [
        "Discuss why a K9 team is being considered and what other measures are in place.",
        "Visit the site to look at the layout, access points, hazards and public contact.",
        "Agree the number of teams, the hours and how the team fits with other security staff.",
        "Set out the proposed arrangement in a written quotation for you to review.",
      ],
      inScope: [
        "Dog and handler teams as part of a site's security arrangements.",
        "Briefing on site rules and on contact with the public, as agreed.",
        "Reporting to the site manager, as agreed.",
      ],
      toConfirm: [
        "Number of teams and hours of cover.",
        "Welfare and relief arrangements.",
        "Insurance and incident terms.",
        "Notice period and review dates.",
      ],
      regulatory: [
        "Working dogs raise welfare and public safety questions, so a provider should be able to explain how both are handled.",
        "Ask any provider what authorisation applies to private security work and to the keeping and use of dogs, and ask for written evidence.",
        "Operational detail such as routines, positions and schedules is deliberately not published by JOLU SECURITY.",
      ],
      quote: quote("the site and why you are considering a K9 team", "Tell us the address or area, the hours you have in mind and what other security measures are already in place.", "The number of teams, welfare arrangements and terms are then set out in a written quotation that you can compare with other providers."),
    },
    faqs: [
      { question: "When does a business need K9 security?", answer: "It can add value at large or open sites, or where a visible deterrent helps. It is not right for every property, and a site assessment should look at whether guards, cameras or fencing would suit better." },
      { question: "What should I ask about the dogs and handlers?", answer: "Ask what training and qualifications handlers hold, how dogs are housed and cared for, and how rest and veterinary needs are managed. Ask for written evidence of each." },
      { question: "Is a K9 team safe around the public?", answer: "Safety depends on training, supervision and site rules. Ask how the team is briefed, how public contact is handled and what insurance applies if something goes wrong." },
      { question: "Can a K9 team replace guards?", answer: "Usually it works alongside them. A team adds a different kind of cover, but guards still control access and respond to events, so most arrangements use both." },
      { question: "What will the provider tell me about operations?", answer: "A responsible provider should explain the service and the controls around it, but it should not publish or share routines, positions or schedules that could weaken your security." },
    ],
  },
  {
    slug: "alarm-response",
    briefId: "C04",
    status: "draft-not-approved",
    metaTitle: "Alarm Response Services in Kenya",
    metaDescription: "What an alarm response service should cover and how to request a site assessment from JOLU SECURITY. What affects the budget for response.",
    h1: "Alarm Response",
    answer:
      "An alarm response service should state how alarms are monitored, who is dispatched, how a situation is escalated, what is reported to you afterwards and what the contract covers. Response commitments should be made only where operations can support them in writing, so ask for the terms in the contract before you rely on any promise.",
    budget: {
      caption: "How budget factors for alarm response differ between two hypothetical sites",
      intro: "The scenarios below are invented to show how each factor changes the scope of an alarm response arrangement. They are not past work, client examples or quotations.",
      scenarioA: { label: "Scenario A: single home (hypothetical)", description: "One property with a small alarm system and a short list of contacts." },
      scenarioB: { label: "Scenario B: business park (hypothetical)", description: "Several units with different alarm systems, many contacts and different opening hours." },
      rows: [
        { factor: "Number of alarm points", whyItMatters: "More sites and zones mean more to monitor and to respond to.", scenarioA: "One alarm panel.", scenarioB: "Several panels across the park." },
        { factor: "Monitoring arrangements", whyItMatters: "How signals reach the provider and who watches them affects the set-up.", scenarioA: "A single signal route.", scenarioB: "Several signal routes with defined escalation." },
        { factor: "Response scope", whyItMatters: "What the responder is asked to do on arrival, and who they report to, sets the scope.", scenarioA: "A visit and a report to the owner.", scenarioB: "A defined procedure agreed with each tenant." },
        { factor: "Contact and escalation list", whyItMatters: "Accurate contact lists are needed for escalation, and keeping them current takes effort.", scenarioA: "A few contacts.", scenarioB: "Many contacts, reviewed regularly." },
        { factor: "Reporting and review", whyItMatters: "Written reports and periodic reviews take time but help improve the arrangement.", scenarioA: "A short report after each event.", scenarioB: "Reports plus a regular review with management." },
      ],
      note: "No indicative figures or response times are published here. The terms for your site come from a written quotation after a site assessment.",
    },
    scope: {
      purpose: [
        "Alarm response means that when an alarm is activated, someone checks what has happened and acts according to an agreed procedure.",
        "It is usually used with an installed alarm system and, at some sites, with guards or CCTV.",
      ],
      buyerRequirements: [
        "Ask how alarm signals reach the provider and what happens when one is received.",
        "Ask what a responder does on arrival and who is told, and in what order.",
        "Ask for response commitments in writing and see what the contract says if they are not met.",
        "Ask how false alarms are handled and how reports are shared with you.",
      ],
      assessmentSteps: [
        "Review the alarm system, how it signals and who currently receives alerts.",
        "Agree the procedure to follow when an alarm activates, including escalation and contact lists.",
        "Discuss reporting and how you want to be told about events.",
        "Set out the proposed arrangement and its limits in a written quotation.",
      ],
      inScope: [
        "Response to alarm activations at agreed sites.",
        "A written procedure and contact list, as agreed.",
        "Reports after events, as agreed.",
      ],
      toConfirm: [
        "Which alarm systems and signals are covered.",
        "Response commitments, if any, and how they are measured.",
        "Escalation list and review dates.",
        "Contract length and notice.",
      ],
      regulatory: [
        "Alarm records and contact lists contain personal information, and the Data Protection Act, 2019 applies to how that information is held and shared.",
        "Where a response involves the police or other authorities, confirm how that liaison works.",
        "Ask the alarm response provider for current evidence of its authorisation to provide private security, and check it with the regulator.",
      ],
      quote: quote("the site, the alarm system you have and what you expect to happen when it activates", "Tell us the address or area, who should be contacted when an alarm sounds and who can arrange a visit.", "The procedure, reporting and any commitments are then set out in a written quotation that you can compare with other providers."),
    },
    faqs: [
      { question: "What should an alarm response service include?", answer: "It should cover how alarms are monitored, who is dispatched, how a situation is escalated, how you are told and what the contract covers. Ask for each element to be set out in writing." },
      { question: "Can a provider commit to arriving within a set period?", answer: "Only if its operations can support the promise in writing. Ask what the commitment is, how it is measured and what happens under the contract if it is not met." },
      { question: "Do I need an alarm system before I use alarm response?", answer: "Usually yes, because response depends on an alarm signal. A site assessment can look at your existing system and whether it can be connected, or whether you need a different arrangement." },
      { question: "What happens after a false alarm?", answer: "Ask how the provider records false alarms, what you are told afterwards and whether repeated false alarms change the terms. Keeping contact lists accurate usually reduces them." },
      { question: "How is my information protected?", answer: "Contact lists and alarm records are personal information. Ask how they are stored, who may see them and how they are updated, in line with Kenyan data protection law." },
    ],
  },
  {
    slug: "vip-close-protection",
    briefId: "C07",
    status: "draft-not-approved",
    metaTitle: "VIP Close Protection in Kenya",
    metaDescription: "How to choose a close protection provider: authorisation, vetting, confidentiality and risk assessment. Request an assessment from JOLU SECURITY.",
    h1: "VIP Close Protection",
    answer:
      "When choosing a close protection provider, check its authorisation, how personnel are background-checked, how confidentiality is protected and how a risk assessment is carried out before anyone is deployed. A responsible provider explains its process without sharing tactics, routes or client details, and puts the scope and limits of the service in writing.",
    budget: {
      caption: "How budget factors for close protection differ between two hypothetical requests",
      intro: "The scenarios below are invented to show how each factor changes the scope of a close protection arrangement. They are not past work, client examples or quotations.",
      scenarioA: { label: "Scenario A: single appointment (hypothetical)", description: "A short, one-off need for one person with a clear schedule." },
      scenarioB: { label: "Scenario B: extended programme (hypothetical)", description: "A longer period of activity with changing locations and several people involved." },
      rows: [
        { factor: "Number of personnel", whyItMatters: "The size of the team depends on the assessed risk and the nature of the activity.", scenarioA: "A small team.", scenarioB: "A larger team for several people." },
        { factor: "Duration", whyItMatters: "Longer arrangements need relief personnel and more planning.", scenarioA: "A short period.", scenarioB: "An extended period." },
        { factor: "Risk assessment", whyItMatters: "A thorough assessment takes time and shapes what is needed.", scenarioA: "A concise assessment.", scenarioB: "A fuller assessment, reviewed as circumstances change." },
        { factor: "Transport and logistics", whyItMatters: "Movement between places adds planning and resources.", scenarioA: "Few movements.", scenarioB: "Frequent movements." },
        { factor: "Confidentiality and handling of information", whyItMatters: "Strict handling of personal information adds process but protects the people involved.", scenarioA: "Standard agreement.", scenarioB: "A detailed agreement and controlled information flow." },
      ],
      note: "No indicative figures or operational detail are published here. The terms for your situation come from a written quotation after a confidential conversation.",
    },
    scope: {
      purpose: [
        "Close protection provides personal protection for individuals and their movements, based on an assessment of the risks they face.",
        "It depends heavily on planning, discretion and clear boundaries between what the provider will and will not do.",
      ],
      buyerRequirements: [
        "Ask for evidence of the provider's authorisation and how personnel are background-checked.",
        "Ask how confidentiality is protected, and how personal information about you and your family is handled.",
        "Ask for a risk assessment before any deployment, and ask how it will be reviewed.",
        "Ask what the provider will not do, so that the limits of the service are clear.",
      ],
      assessmentSteps: [
        "Hold a confidential conversation about the purpose, the risks you are concerned about and the timing.",
        "Agree what information is shared, with whom and how it will be protected.",
        "Carry out a risk assessment and agree the proposed arrangement.",
        "Set out the scope and limits in a written quotation and agreement.",
      ],
      inScope: [
        "Personal protection for individuals and their movements, as agreed.",
        "A written risk assessment and agreement before deployment.",
        "Confidential handling of information.",
      ],
      toConfirm: [
        "Scope, duration and number of personnel.",
        "Confidentiality terms.",
        "Review dates and how changes are handled.",
        "Notice period and contract terms.",
      ],
      regulatory: [
        "Providers of private security in Kenya operate under the Private Security Regulation Act, 2016. Ask for current evidence of authorisation and check it with the regulator.",
        "Personal information about you is protected by the Data Protection Act, 2019, so ask how it is handled and stored.",
        "No tactical, route, schedule or client detail is published on this page.",
      ],
      quote: quote("your need in terms you are comfortable sharing", "Say only what you wish to share at first, and tell us how you prefer to be contacted so that the conversation stays confidential.", "The scope, limits and terms are then set out in a written quotation that you can compare with other providers."),
    },
    faqs: [
      { question: "How do I choose a close protection provider?", answer: "Check authorisation, ask how personnel are background-checked, ask how confidentiality is protected and ask for a risk assessment before deployment. A responsible provider will also explain the limits of what it will do." },
      { question: "Why is a risk assessment needed?", answer: "It identifies the risks you actually face, so that the team, duration and arrangements fit the situation rather than a standard package. It should be reviewed when circumstances change." },
      { question: "What will a provider share about its methods?", answer: "It should explain its process in general terms, but it should not publish or share tactics, routes, schedules or client details, because that could weaken the protection it provides." },
      { question: "How is my personal information protected?", answer: "Ask how information about you and your family is collected, stored and shared, and who inside the provider can see it. A written confidentiality agreement is a sensible starting point." },
      { question: "How do I start the conversation?", answer: "Use the enquiry form or call, and say only what you are comfortable sharing at first. A confidential conversation can then decide what information is needed for an assessment." },
    ],
  },
]

export function getServiceContent(slug: string): ServiceContent | undefined {
  return SERVICE_CONTENT.find((c) => c.slug === slug)
}

export const SERVICE_CONTENT_SLUGS: readonly ServiceSlug[] = SERVICE_CONTENT.map((c) => c.slug)
