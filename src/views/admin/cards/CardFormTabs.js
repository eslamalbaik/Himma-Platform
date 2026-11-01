// The parts of the smart-card form (/admin/cards/{id}): profile, links, books and events. They edit one
// `form` object that the page saves in a single PUT /api/admin/cards/{id}.

// ** MUI Imports
import Box from '@mui/material/Box'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components
import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import RowsEditor from 'src/views/admin/cards/RowsEditor'
import { BOOK_FORMATS, CARD_KINDS, EVENT_TYPES, LINK_ICONS, LINK_TYPES, pick } from 'src/views/site/cards/helpers'

export const emptyCard = {
  slug: '',
  kind: 'author',
  status: 'draft',
  nameAr: '',
  nameEn: '',
  headlineAr: '',
  headlineEn: '',
  bioAr: '',
  bioEn: '',
  photoUrl: '',
  color: '#9A5B13',
  email: '',
  phone: '',
  publisherAr: '',
  publisherEn: '',
  rightsAr: '',
  rightsEn: '',
  acceptsRequests: true,
  newsletterEnabled: true,
  links: [],
  books: [],
  events: []
}

// "2026-11-20T19:00" for <input type='datetime-local'>, in the browser's time zone.
export const toLocalInput = iso => {
  if (!iso) return ''
  const date = new Date(iso)
  const pad = n => String(n).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`
}

// Text fields of one object: `<TextFor obj={book} set={patch} name='titleAr' label='...' />`.
const TextFor = ({ obj, set, name, label, disabled, ...extra }) => (
  <CustomTextField
    fullWidth
    label={label}
    value={obj[name] ?? ''}
    disabled={disabled}
    onChange={e => set({ [name]: e.target.value })}
    {...extra}
  />
)

const Pair = ({ obj, set, name, prefix, disabled, ...extra }) => {
  const { t } = useTranslation()

  return (
    <>
      <Grid item xs={12} sm={6}>
        <TextFor
          obj={obj}
          set={set}
          name={`${name}Ar`}
          label={t(`${prefix}.${name}Ar`)}
          disabled={disabled}
          {...extra}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextFor
          obj={obj}
          set={set}
          name={`${name}En`}
          label={t(`${prefix}.${name}En`)}
          disabled={disabled}
          {...extra}
        />
      </Grid>
    </>
  )
}

export const ProfileTab = ({ form, set, disabled }) => {
  const { t } = useTranslation()
  const p = 'admin.cards.form'

  return (
    <Grid container spacing={4}>
      <Grid item xs={12} sm={4}>
        <TextFor
          obj={form}
          set={set}
          name='slug'
          label={t(`${p}.slug`)}
          disabled={disabled}
          helperText={t(`${p}.slugHelp`)}
          inputProps={{ dir: 'ltr' }}
          onChange={e => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
        />
      </Grid>
      <Grid item xs={6} sm={4}>
        <TextFor obj={form} set={set} name='kind' label={t(`${p}.kind`)} disabled={disabled} select>
          {CARD_KINDS.map(kind => (
            <MenuItem key={kind} value={kind}>
              {t(`cards.kinds.${kind}`)}
            </MenuItem>
          ))}
        </TextFor>
      </Grid>
      <Grid item xs={6} sm={4}>
        <TextFor obj={form} set={set} name='status' label={t(`${p}.status`)} disabled={disabled} select>
          {['draft', 'published'].map(status => (
            <MenuItem key={status} value={status}>
              {t(`admin.cards.statuses.${status}`)}
            </MenuItem>
          ))}
        </TextFor>
      </Grid>
      <Pair obj={form} set={set} name='name' prefix={p} disabled={disabled} required />
      <Pair obj={form} set={set} name='headline' prefix={p} disabled={disabled} />
      <Pair obj={form} set={set} name='bio' prefix={p} disabled={disabled} multiline minRows={4} />
      <Grid item xs={12} sm={8}>
        <TextFor
          obj={form}
          set={set}
          name='photoUrl'
          label={t(`${p}.photoUrl`)}
          disabled={disabled}
          helperText={t(`${p}.urlHelp`)}
          inputProps={{ dir: 'ltr' }}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextFor
          obj={form}
          set={set}
          name='color'
          type='color'
          label={t(`${p}.color`)}
          disabled={disabled}
          inputProps={{ style: { height: 24, padding: 0 } }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextFor obj={form} set={set} name='email' type='email' label={t(`${p}.email`)} disabled={disabled} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextFor
          obj={form}
          set={set}
          name='phone'
          type='tel'
          label={t(`${p}.phone`)}
          disabled={disabled}
          inputProps={{ dir: 'ltr' }}
        />
      </Grid>
      {form.kind === 'author' ? (
        <>
          <Grid item xs={12}>
            <Typography sx={{ fontWeight: 600, mt: 2 }}>{t(`${p}.publishing`)}</Typography>
          </Grid>
          <Pair obj={form} set={set} name='publisher' prefix={p} disabled={disabled} />
          <Pair obj={form} set={set} name='rights' prefix={p} disabled={disabled} />
        </>
      ) : null}
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={form.acceptsRequests}
              disabled={disabled}
              onChange={e => set({ acceptsRequests: e.target.checked })}
            />
          }
          label={t(`${p}.acceptsRequests`)}
        />
        <FormControlLabel
          control={
            <Switch
              checked={form.newsletterEnabled}
              disabled={disabled}
              onChange={e => set({ newsletterEnabled: e.target.checked })}
            />
          }
          label={t(`${p}.newsletterEnabled`)}
        />
      </Grid>
    </Grid>
  )
}

export const LinksTab = ({ form, set, disabled }) => {
  const { t, i18n } = useTranslation()
  const p = 'admin.cards.links'

  return (
    <RowsEditor
      rows={form.links}
      onChange={links => set({ links })}
      newRow={() => ({ type: 'website', labelAr: '', labelEn: '', url: 'https://' })}
      addLabel={t(`${p}.add`)}
      emptyLabel={t(`${p}.empty`)}
      disabled={disabled}
      titleOf={link => (
        <Box component='span' sx={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
          <Icon icon={LINK_ICONS[link.type]} />
          {pick(link, 'label', i18n.language) || t(`cards.linkTypes.${link.type}`)}
        </Box>
      )}
    >
      {(link, patch) => (
        <Grid container spacing={4}>
          <Grid item xs={12} sm={4}>
            <TextFor obj={link} set={patch} name='type' label={t(`${p}.type`)} disabled={disabled} select>
              {LINK_TYPES.map(type => (
                <MenuItem key={type} value={type}>
                  {t(`cards.linkTypes.${type}`)}
                </MenuItem>
              ))}
            </TextFor>
          </Grid>
          <Grid item xs={12} sm={8}>
            <TextFor
              obj={link}
              set={patch}
              name='url'
              label={t(`${p}.url`)}
              helperText={t(`${p}.urlHelp`)}
              disabled={disabled}
              inputProps={{ dir: 'ltr' }}
            />
          </Grid>
          <Pair obj={link} set={patch} name='label' prefix={p} disabled={disabled} />
        </Grid>
      )}
    </RowsEditor>
  )
}

export const BooksTab = ({ form, set, disabled }) => {
  const { t, i18n } = useTranslation()
  const p = 'admin.cards.books'

  return (
    <RowsEditor
      rows={form.books}
      onChange={books => set({ books })}
      newRow={() => ({ titleAr: '', titleEn: '', isbn: '', format: 'print', year: '', coverUrl: '', storeUrl: '' })}
      addLabel={t(`${p}.add`)}
      emptyLabel={t(`${p}.empty`)}
      disabled={disabled}
      titleOf={(book, index) => pick(book, 'title', i18n.language) || `${t(`${p}.book`)} ${index + 1}`}
    >
      {(book, patch) => (
        <Grid container spacing={4}>
          <Pair obj={book} set={patch} name='title' prefix={p} disabled={disabled} required />
          <Grid item xs={12} sm={4}>
            <TextFor
              obj={book}
              set={patch}
              name='isbn'
              label={t(`${p}.isbn`)}
              disabled={disabled}
              inputProps={{ dir: 'ltr' }}
            />
          </Grid>
          <Grid item xs={6} sm={4}>
            <TextFor obj={book} set={patch} name='format' label={t(`${p}.format`)} disabled={disabled} select>
              {BOOK_FORMATS.map(format => (
                <MenuItem key={format} value={format}>
                  {t(`cards.bookFormats.${format}`)}
                </MenuItem>
              ))}
            </TextFor>
          </Grid>
          <Grid item xs={6} sm={4}>
            <TextFor obj={book} set={patch} name='year' type='number' label={t(`${p}.year`)} disabled={disabled} />
          </Grid>
          <Pair obj={book} set={patch} name='description' prefix={p} disabled={disabled} multiline minRows={2} />
          <Grid item xs={12} sm={6}>
            <TextFor
              obj={book}
              set={patch}
              name='storeUrl'
              label={t(`${p}.storeUrl`)}
              disabled={disabled}
              inputProps={{ dir: 'ltr' }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextFor
              obj={book}
              set={patch}
              name='coverUrl'
              label={t(`${p}.coverUrl`)}
              disabled={disabled}
              inputProps={{ dir: 'ltr' }}
            />
          </Grid>
        </Grid>
      )}
    </RowsEditor>
  )
}

export const EventsTab = ({ form, set, disabled }) => {
  const { t, i18n } = useTranslation()
  const p = 'admin.cards.events'

  return (
    <RowsEditor
      rows={form.events}
      onChange={events => set({ events })}
      newRow={() => ({
        type: 'launch',
        titleAr: '',
        titleEn: '',
        startsAt: '',
        locationAr: '',
        locationEn: '',
        summaryAr: '',
        summaryEn: '',
        liveUrl: '',
        bookTitle: '',
        programme: []
      })}
      addLabel={t(`${p}.add`)}
      emptyLabel={t(`${p}.empty`)}
      disabled={disabled}
      titleOf={(event, index) => pick(event, 'title', i18n.language) || `${t(`${p}.event`)} ${index + 1}`}
    >
      {(event, patch) => (
        <Grid container spacing={4}>
          <Grid item xs={12} sm={4}>
            <TextFor obj={event} set={patch} name='type' label={t(`${p}.type`)} disabled={disabled} select>
              {EVENT_TYPES.map(type => (
                <MenuItem key={type} value={type}>
                  {t(`cards.eventTypes.${type}`)}
                </MenuItem>
              ))}
            </TextFor>
          </Grid>
          <Grid item xs={12} sm={4}>
            <CustomTextField
              fullWidth
              type='datetime-local'
              label={t(`${p}.startsAt`)}
              disabled={disabled}
              value={toLocalInput(event.startsAt)}
              onChange={e => patch({ startsAt: e.target.value ? new Date(e.target.value).toISOString() : '' })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextFor obj={event} set={patch} name='bookTitle' label={t(`${p}.bookTitle`)} disabled={disabled} select>
              <MenuItem value=''>{t(`${p}.noBook`)}</MenuItem>
              {form.books
                .filter(book => book.titleEn)
                .map((book, index) => (
                  <MenuItem key={book.id || index} value={book.titleEn}>
                    {pick(book, 'title', i18n.language)}
                  </MenuItem>
                ))}
            </TextFor>
          </Grid>
          <Pair obj={event} set={patch} name='title' prefix={p} disabled={disabled} required />
          <Pair obj={event} set={patch} name='location' prefix={p} disabled={disabled} />
          <Pair obj={event} set={patch} name='summary' prefix={p} disabled={disabled} multiline minRows={2} />
          <Grid item xs={12}>
            <TextFor
              obj={event}
              set={patch}
              name='liveUrl'
              label={t(`${p}.liveUrl`)}
              helperText={t(`${p}.liveUrlHelp`)}
              disabled={disabled}
              inputProps={{ dir: 'ltr' }}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography sx={{ fontWeight: 600, mb: 3 }}>{t(`${p}.programme`)}</Typography>
            <RowsEditor
              dense
              rows={event.programme}
              onChange={programme => patch({ programme })}
              newRow={() => ({
                minute: event.programme.length ? Number(event.programme[event.programme.length - 1].minute) + 10 : 0,
                titleAr: '',
                titleEn: ''
              })}
              addLabel={t(`${p}.addStep`)}
              disabled={disabled}
              titleOf={step => t('cards.event.minute', { minute: Number(step.minute) || 0 })}
            >
              {(step, patchStep) => (
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={2}>
                    <TextFor
                      obj={step}
                      set={patchStep}
                      name='minute'
                      type='number'
                      label={t(`${p}.minute`)}
                      disabled={disabled}
                    />
                  </Grid>
                  <Grid item xs={12} sm={5}>
                    <TextFor obj={step} set={patchStep} name='titleAr' label={t(`${p}.stepAr`)} disabled={disabled} />
                  </Grid>
                  <Grid item xs={12} sm={5}>
                    <TextFor obj={step} set={patchStep} name='titleEn' label={t(`${p}.stepEn`)} disabled={disabled} />
                  </Grid>
                </Grid>
              )}
            </RowsEditor>
          </Grid>
        </Grid>
      )}
    </RowsEditor>
  )
}
