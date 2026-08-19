import React from 'react'
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import type { WeeklyReportData } from './generateWeeklyReport'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', color: '#16233f' },
  header: { marginBottom: 24, borderBottom: '2 solid #16233f', paddingBottom: 14 },
  eyebrow: { fontSize: 10, letterSpacing: 1.5, color: '#7a1f2b', marginBottom: 6, textTransform: 'uppercase' },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 11, color: '#4b5878' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 24, gap: 12 },
  statBox: { width: '47%', border: '1 solid #ccc', borderRadius: 6, padding: 14, marginBottom: 12 },
  statLabel: { fontSize: 9, color: '#4b5878', marginBottom: 6, textTransform: 'uppercase' },
  statValue: { fontSize: 26, fontWeight: 700, color: '#16233f' },
  sectionTitle: { fontSize: 13, fontWeight: 700, marginBottom: 10, marginTop: 10 },
  note: { fontSize: 10, color: '#4b5878', marginBottom: 16, lineHeight: 1.5 },
  tableRow: { flexDirection: 'row', borderBottom: '1 solid #eee', paddingVertical: 8 },
  tableHeaderRow: { flexDirection: 'row', borderBottom: '1.5 solid #16233f', paddingVertical: 6 },
  colTeacher: { width: '45%', fontSize: 10 },
  colDays: { width: '55%', fontSize: 10, color: '#7a1f2b' },
  headerText: { fontSize: 9, textTransform: 'uppercase', color: '#4b5878' },
  emptyNote: { fontSize: 11, color: '#4b5878', fontStyle: 'italic', marginTop: 8 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, fontSize: 8, color: '#999', textAlign: 'center' },
})

function ReportDocument({ data }: { data: WeeklyReportData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>BBI Ventures · PSSA Mission Control</Text>
          <Text style={styles.title}>Weekly Mission Report</Text>
          <Text style={styles.subtitle}>{data.schoolName} · Days {data.weekStartDay}–{data.weekEndDay}</Text>
        </View>

        <View style={styles.statGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Game Piece Spaces Moved This Week</Text>
            <Text style={styles.statValue}>{data.totalSpacesMovedThisWeek}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>School Goal</Text>
            <Text style={styles.statValue}>{data.schoolGoal}%</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Highest Score This Week</Text>
            <Text style={styles.statValue}>{data.highestPctThisWeek}%</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Highest Score So Far This Year</Text>
            <Text style={styles.statValue}>{data.highestPctAllYear}%</Text>
          </View>
        </View>

        <Text style={styles.note}>
          Scores above reflect the whole school&apos;s performance without naming individual classrooms, to keep the focus on shared progress rather than comparison between classes.
        </Text>

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Reactors That Should Currently Be Removed From the Hallway Board</Text>
          <Text style={styles.statValue}>{data.reactorsToRemove}</Text>
        </View>

        <Text style={styles.sectionTitle}>Classrooms Not Fully Completed This Week</Text>
        {data.incompleteTeachers.length === 0 ? (
          <Text style={styles.emptyNote}>Every classroom completed every mission this week — great work, school-wide!</Text>
        ) : (
          <View>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.colTeacher, styles.headerText]}>Teacher / Class</Text>
              <Text style={[styles.colDays, styles.headerText]}>Missed Day(s)</Text>
            </View>
            {data.incompleteTeachers.map((t, i) => (
              <View style={styles.tableRow} key={i}>
                <Text style={styles.colTeacher}>{t.teacherName} — Grade {t.gradeLevel}{t.sectionLabel !== 'All Day' ? ` (${t.sectionLabel})` : ''}</Text>
                <Text style={styles.colDays}>{t.missedDays.join(', ')}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footer}>Generated automatically by PSSA Mission Control · BBI Ventures</Text>
      </Page>
    </Document>
  )
}

export async function renderWeeklyReportPdf(data: WeeklyReportData): Promise<Buffer> {
  return await renderToBuffer(<ReportDocument data={data} />)
}
