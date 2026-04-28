import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { mechanicsAPI, ratingsAPI, getApiErrorMessage } from '../../services/api'
import { colors } from '../../theme/colors'
import { fonts } from '../../theme/fonts'
import { layout } from '../../theme/layout'
import { bookingStatusLabel } from '../../utils/bookingStatusBadge'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { LoadingOverlay } from '../../components/LoadingOverlay'

const PAD = layout.screenPaddingHorizontal

type NearbySummary = {
  jobsCompleted?: number
  distanceKm?: number
  averageRating?: number
  typicalResponseHours?: number
  nextAvailableNote?: string | null
}

type PublicMechanic = {
  companyName: string
  ownerFullName: string
  bio: string
  experience: string
  workshopAddress: string
  city: string
  state: string
  zipCode: string
  isVerified: boolean
  avatarUrl: string | null
  expertise: string[]
  vehicleTypes: string[]
  brands: string[]
  typicalResponseHours: number | null
  nextAvailableNote: string
  availability: boolean
  certificateUrl: string | null
  jobsCompletedFromApi: number | null
}

function readPublicMechanic(data: any): PublicMechanic | null {
  if (!data || typeof data !== 'object') return null
  const root = data
  const p = root.profile && typeof root.profile === 'object' ? root.profile : {}
  const first = (keys: string[]) => {
    for (const k of keys) {
      const v = (p as any)[k]
      if (v !== undefined && v !== null) return v
      const r = (root as any)[k]
      if (r !== undefined && r !== null) return r
    }
    return undefined
  }
  const thr = first(['typicalResponseHours'])
  let typicalResponseHours: number | null = null
  if (typeof thr === 'number' && !Number.isNaN(thr)) typicalResponseHours = thr
  else if (thr != null && thr !== '') {
    const n = Number(thr)
    if (!Number.isNaN(n)) typicalResponseHours = n
  }
  const jc =
    typeof root.jobsCompleted === 'number'
      ? root.jobsCompleted
      : typeof root.stats?.jobsCompleted === 'number'
        ? root.stats.jobsCompleted
        : null
  return {
    companyName: String(first(['companyName']) ?? root.companyName ?? 'Garage'),
    ownerFullName: String(first(['ownerFullName']) ?? root.ownerFullName ?? ''),
    bio: String(first(['bio']) ?? ''),
    experience: String(first(['experience']) ?? ''),
    workshopAddress: String(first(['workshopAddress']) ?? ''),
    city: String(first(['city']) ?? ''),
    state: String(first(['state']) ?? ''),
    zipCode: String(first(['zipCode']) ?? ''),
    isVerified: root.isVerified === true || first(['verified']) === true,
    avatarUrl: (first(['avatar', 'avatarUrl']) as string) ?? null,
    expertise: Array.isArray(first(['expertise'])) ? (first(['expertise']) as string[]) : [],
    vehicleTypes: Array.isArray(first(['vehicleTypes'])) ? (first(['vehicleTypes']) as string[]) : [],
    brands: Array.isArray(first(['brands'])) ? (first(['brands']) as string[]) : [],
    typicalResponseHours,
    nextAvailableNote: String(first(['nextAvailableNote']) ?? ''),
    availability: (first(['availability']) as boolean | undefined) !== false,
    certificateUrl: (first(['certificateUrl']) as string) ?? null,
    jobsCompletedFromApi: jc,
  }
}

type PublicJobRow = {
  id: string
  status: string
  faultName: string
  vehicleLabel: string
  whenLabel: string
}

type RatingRow = {
  id: string
  stars: number
  comment: string
  when: string
  by: string
}

function normalizeRatingsPayload(raw: unknown): any[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    const inner = o.items ?? o.ratings ?? o.data ?? o.results
    if (Array.isArray(inner)) return inner
  }
  return []
}

function formatRatingRow(item: any, index: number): RatingRow {
  const starsRaw =
    item.stars ?? item.rating ?? item.score ?? item.starRating ?? item.value ?? item.ratingValue
  const stars = typeof starsRaw === 'number' && !Number.isNaN(starsRaw) ? starsRaw : Number(starsRaw) || 0
  const comment = String(item.comment ?? item.review ?? item.text ?? item.message ?? '').trim()
  const created = item.createdAt ?? item.created_at ?? item.date
  let when = ''
  try {
    if (created) when = new Date(created).toLocaleDateString()
  } catch (_) {}
  const u = item.user ?? item.reviewer ?? item.author
  const by =
    typeof u === 'string'
      ? u
      : [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim() || u?.name || 'Customer'
  const id = String(item.id ?? item._id ?? `r-${index}`)
  return { id, stars, comment, when, by }
}

export function MechanicPublicProfileScreen({
  navigation,
  route,
}: {
  navigation: any
  route: { params?: { mechanicId?: string; fromNearbySummary?: NearbySummary; preferredMechanicName?: string } }
}) {
  const mechanicId = route.params?.mechanicId ?? ''
  const summary = route.params?.fromNearbySummary
  const [mechanic, setMechanic] = useState<PublicMechanic | null>(null)
  const [average, setAverage] = useState<number | null>(null)
  const [reviews, setReviews] = useState<RatingRow[]>([])
  const [publicJobs, setPublicJobs] = useState<PublicJobRow[]>([])
  const [completedJobCount, setCompletedJobCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!mechanicId) {
      setError('Missing mechanic')
      setLoading(false)
      return
    }
    setError(null)
    try {
      const [mechRes, avgRes, listRes, jobsRes] = await Promise.all([
        mechanicsAPI.getById(mechanicId),
        ratingsAPI.getMechanicAverage(mechanicId).catch(() => ({ data: {} })),
        ratingsAPI.getMechanicRatings(mechanicId).catch(() => ({ data: [] })),
        mechanicsAPI.getPublicJobHistory(mechanicId, 40).catch(() => ({ data: null })),
      ])
      const parsed = readPublicMechanic(mechRes.data)
      setMechanic(parsed)
      if (!parsed) setError('Could not load this garage profile.')

      const avg = (avgRes as { data?: { average?: number } }).data?.average
      setAverage(typeof avg === 'number' && !Number.isNaN(avg) ? avg : null)

      const listRaw = normalizeRatingsPayload((listRes as { data?: unknown }).data)
      setReviews(listRaw.slice(0, 40).map((item, i) => formatRatingRow(item, i)))

      const jd = (jobsRes as { data?: { completedJobCount?: number; jobs?: unknown[] } }).data
      if (jd && typeof jd.completedJobCount === 'number') setCompletedJobCount(jd.completedJobCount)
      else setCompletedJobCount(null)
      const rows = Array.isArray(jd?.jobs) ? jd!.jobs! : []
      setPublicJobs(
        rows.map((row: any) => {
          const done = row.completedAt ?? row.createdAt
          let whenLabel = ''
          try {
            if (done) whenLabel = new Date(done).toLocaleDateString()
          } catch (_) {}
          return {
            id: String(row.id),
            status: String(row.status ?? ''),
            faultName: String(row.faultName ?? 'Service'),
            vehicleLabel: String(row.vehicleLabel ?? '').trim() || 'Vehicle',
            whenLabel,
          }
        })
      )
    } catch (e: any) {
      setError(getApiErrorMessage(e, 'Something went wrong.'))
      setMechanic(null)
      setPublicJobs([])
      setCompletedJobCount(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [mechanicId])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  const onRefresh = () => {
    setRefreshing(true)
    void load()
  }

  const requestService = () => {
    if (!mechanicId) return
    const name = mechanic?.companyName ?? route.params?.preferredMechanicName
    navigation.navigate('Main', {
      screen: 'FindMechanics',
      params: {
        preferredMechanicId: mechanicId,
        ...(name ? { preferredMechanicName: name } : {}),
      },
    })
  }

  if (!mechanicId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>No garage selected.</Text>
        <Button title="Go back" variant="outline" onPress={() => navigation.goBack()} style={{ marginTop: 16 }} />
      </View>
    )
  }

  if (loading) return <LoadingOverlay />

  if (error && !mechanic) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.neutral[400]} />
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Try again" onPress={() => { setLoading(true); void load() }} style={{ marginTop: 16 }} />
        <Button title="Go back" variant="outline" onPress={() => navigation.goBack()} style={{ marginTop: 10 }} />
      </View>
    )
  }

  const m = mechanic!
  const displayName = m.companyName || 'Garage'
  const jobsDone =
    typeof completedJobCount === 'number' && completedJobCount > 0
      ? completedJobCount
      : typeof summary?.jobsCompleted === 'number'
        ? summary.jobsCompleted
        : typeof m.jobsCompletedFromApi === 'number'
          ? m.jobsCompletedFromApi
          : null
  const ratingDisplay =
    typeof summary?.averageRating === 'number' && !Number.isNaN(summary.averageRating)
      ? summary.averageRating
      : average
  const distLabel =
    typeof summary?.distanceKm === 'number' ? `${summary.distanceKm.toFixed(1)} km away` : null
  const responseH =
    typeof summary?.typicalResponseHours === 'number'
      ? summary.typicalResponseHours
      : m.typicalResponseHours

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Card style={styles.heroCard}>
        <View style={styles.heroRow}>
          {m.avatarUrl ? (
            <Image source={{ uri: m.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="business" size={32} color={colors.neutral[500]} />
            </View>
          )}
          <View style={styles.heroText}>
            <View style={styles.titleRow}>
              <Text style={styles.companyName} numberOfLines={2}>
                {displayName}
              </Text>
              {m.isVerified ? (
                <View style={styles.verified}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.accent.green} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              ) : null}
            </View>
            {m.ownerFullName ? (
              <Text style={styles.ownerName} numberOfLines={1}>
                {m.ownerFullName}
              </Text>
            ) : null}
            <Text style={styles.disclaimer}>
              Phone numbers are not shown here so quotes, chat, and payment stay on the platform.
            </Text>
          </View>
        </View>

        <View style={styles.statRow}>
          {typeof ratingDisplay === 'number' ? (
            <View style={styles.statPill}>
              <Ionicons name="star" size={16} color={colors.accent.amber} />
              <Text style={styles.statPillText}>{ratingDisplay.toFixed(1)} avg</Text>
            </View>
          ) : null}
          <View style={styles.statPill}>
            <Ionicons name="chatbubbles-outline" size={16} color={colors.brand.primary} />
            <Text style={styles.statPillText}>{reviews.length} reviews</Text>
          </View>
          {typeof jobsDone === 'number' && jobsDone > 0 ? (
            <View style={styles.statPill}>
              <Ionicons name="ribbon-outline" size={16} color={colors.brand.primary} />
              <Text style={styles.statPillText}>{jobsDone} jobs on platform</Text>
            </View>
          ) : null}
        </View>
        {distLabel ? (
          <View style={styles.distRow}>
            <Ionicons name="navigate-outline" size={16} color={colors.neutral[600]} />
            <Text style={styles.distText}>{distLabel}</Text>
          </View>
        ) : null}
        {typeof responseH === 'number' && responseH > 0 ? (
          <View style={styles.distRow}>
            <Ionicons name="time-outline" size={16} color={colors.neutral[600]} />
            <Text style={styles.distText}>Often responds within ~{responseH}h</Text>
          </View>
        ) : null}
        {(summary?.nextAvailableNote || m.nextAvailableNote) ? (
          <Text style={styles.nextNote} numberOfLines={3}>
            {String(summary?.nextAvailableNote || m.nextAvailableNote)}
          </Text>
        ) : null}
        {!m.availability ? (
          <View style={styles.unavailable}>
            <Ionicons name="moon-outline" size={16} color={colors.neutral[600]} />
            <Text style={styles.unavailableText}>May be limited on new requests right now.</Text>
          </View>
        ) : null}
      </Card>

      {m.experience ? (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Experience</Text>
          <Text style={styles.body}>{m.experience}</Text>
        </Card>
      ) : null}

      {m.bio ? (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.body}>{m.bio}</Text>
        </Card>
      ) : null}

      {(m.expertise?.length ?? 0) > 0 ? (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Expertise</Text>
          <View style={styles.chips}>
            {m.expertise.map((ex) => (
              <View key={ex} style={styles.chip}>
                <Text style={styles.chipText}>{ex}</Text>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      {(m.vehicleTypes?.length ?? 0) > 0 || (m.brands?.length ?? 0) > 0 ? (
        <Card style={styles.section}>
          {m.vehicleTypes.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Vehicle types</Text>
              <View style={styles.chips}>
                {m.vehicleTypes.map((t) => (
                  <View key={t} style={styles.chipMuted}>
                    <Text style={styles.chipMutedText}>{t}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}
          {m.brands.length > 0 ? (
            <>
              <Text style={[styles.sectionTitle, { marginTop: m.vehicleTypes.length ? 14 : 0 }]}>Brands</Text>
              <View style={styles.chips}>
                {m.brands.slice(0, 24).map((b) => (
                  <View key={b} style={styles.chipMuted}>
                    <Text style={styles.chipMutedText}>{b}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </Card>
      ) : null}

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Workshop</Text>
        {m.workshopAddress ? <Text style={styles.body}>{m.workshopAddress}</Text> : null}
        {[m.city, m.state, m.zipCode].filter(Boolean).length > 0 ? (
          <Text style={styles.muted}>{[m.city, m.state, m.zipCode].filter(Boolean).join(', ')}</Text>
        ) : !m.workshopAddress ? (
          <Text style={styles.muted}>Address on file (exact location shared when a job is confirmed).</Text>
        ) : null}
        {m.certificateUrl ? (
          <View style={styles.docRow}>
            <Ionicons name="document-text-outline" size={18} color={colors.accent.green} />
            <Text style={styles.docText}>Verification documents on file</Text>
          </View>
        ) : null}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Jobs on the platform</Text>
        <Text style={styles.muted}>
          Recent completed work (issue and vehicle type only, no customer contact details).
        </Text>
        {publicJobs.length === 0 ? (
          <Text style={[styles.muted, { marginTop: 10 }]}>
            {completedJobCount === 0
              ? 'No completed jobs listed yet.'
              : 'Job list could not be loaded. Pull to refresh, or try again later.'}
          </Text>
        ) : (
          publicJobs.map((j) => (
            <View key={j.id} style={styles.jobRow}>
              <View style={styles.jobRowTop}>
                <Text style={styles.jobFault} numberOfLines={2}>
                  {j.faultName}
                </Text>
                <Text style={styles.jobStatus}>{bookingStatusLabel(j.status)}</Text>
              </View>
              <Text style={styles.jobVehicle} numberOfLines={1}>
                {j.vehicleLabel}
              </Text>
              {j.whenLabel ? <Text style={styles.jobWhen}>{j.whenLabel}</Text> : null}
            </View>
          ))
        )}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Customer reviews</Text>
        {reviews.length === 0 ? (
          <Text style={styles.muted}>No written reviews yet. Ratings still help you compare garages after you search.</Text>
        ) : (
          reviews.map((r) => (
            <View key={r.id} style={styles.reviewBlock}>
              <View style={styles.reviewTop}>
                <Text style={styles.reviewBy} numberOfLines={1}>
                  {r.by}
                </Text>
                {r.when ? <Text style={styles.reviewWhen}>{r.when}</Text> : null}
              </View>
              {r.stars > 0 ? (
                <View style={styles.starsRow}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Ionicons
                      key={i}
                      name={i < Math.round(r.stars) ? 'star' : 'star-outline'}
                      size={14}
                      color={colors.accent.amber}
                    />
                  ))}
                </View>
              ) : null}
              {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
            </View>
          ))
        )}
      </Card>

      <Button title="Request service from this garage" onPress={requestService} style={styles.cta} />
      <Text style={styles.footerHint}>
        You will choose your vehicle and issue on the next screen, then send the request so this garage can quote you in the app.
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: PAD, paddingTop: 16, paddingBottom: 40 },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.neutral[600],
    textAlign: 'center',
    marginTop: 12,
  },
  heroCard: { padding: 20, marginBottom: 12 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  avatar: { width: 72, height: 72, borderRadius: 16, backgroundColor: colors.neutral[200] },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 4 },
  companyName: { fontFamily: fonts.headingBold, fontSize: 20, color: colors.text, flexShrink: 1 },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.accent.green },
  ownerName: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.neutral[600], marginBottom: 8 },
  disclaimer: { fontSize: 12, lineHeight: 18, color: colors.neutral[500] },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  statPillText: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.text },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  distText: { fontSize: 13, color: colors.neutral[600] },
  nextNote: { marginTop: 10, fontSize: 13, lineHeight: 20, color: colors.neutral[700] },
  unavailable: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  unavailableText: { fontSize: 13, color: colors.neutral[600], flex: 1 },
  section: { padding: 18, marginBottom: 12 },
  sectionTitle: { fontFamily: fonts.headingBold, fontSize: 16, color: colors.text, marginBottom: 10 },
  body: { fontSize: 15, lineHeight: 22, color: colors.neutral[800] },
  muted: { fontSize: 14, lineHeight: 20, color: colors.neutral[500], marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.brand.primary + '18',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  chipText: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.brand.primary },
  chipMuted: {
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  chipMutedText: { fontSize: 12, color: colors.neutral[700] },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  docText: { fontSize: 13, color: colors.neutral[700], fontFamily: fonts.semiBold },
  reviewBlock: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[200],
  },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewBy: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text, flex: 1, marginRight: 8 },
  reviewWhen: { fontSize: 12, color: colors.neutral[500] },
  starsRow: { flexDirection: 'row', gap: 2, marginBottom: 6 },
  reviewComment: { fontSize: 14, lineHeight: 20, color: colors.neutral[700] },
  jobRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[200],
  },
  jobRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  jobFault: { flex: 1, fontFamily: fonts.semiBold, fontSize: 15, color: colors.text },
  jobStatus: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.neutral[500] },
  jobVehicle: { fontSize: 13, color: colors.neutral[600], marginTop: 4 },
  jobWhen: { fontSize: 12, color: colors.neutral[500], marginTop: 4 },
  cta: { marginTop: 8 },
  footerHint: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 18,
    color: colors.neutral[500],
    textAlign: 'center',
    paddingHorizontal: 8,
  },
})
