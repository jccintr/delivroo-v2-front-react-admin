import { useState } from 'react';
import { PageHeader, Tabs } from '../../components/ui.jsx';
import HoursSection from './HoursSection.jsx';
import ListSections from './ListSections.jsx';
import MessagesSection from './MessagesSection.jsx';
import ProfileSection from './ProfileSection.jsx';

const { ZonesSection, PaymentsSection } = ListSections;

export default function SettingsPage() {
  const [tab, setTab] = useState('profile');
  return (
    <>
      <PageHeader title="Configurações" subtitle="Dados da loja, horários, entrega, pagamentos e mensagens.">
        <Tabs value={tab} onChange={setTab} tabs={[
          { key: 'profile', label: 'Loja' }, { key: 'hours', label: 'Horários' }, { key: 'zones', label: 'Entrega' },
          { key: 'payments', label: 'Pagamentos' }, { key: 'messages', label: 'Mensagens' },
        ]} />
      </PageHeader>
      <div className="mx-auto max-w-3xl">
        {tab === 'profile' && <ProfileSection />}
        {tab === 'hours' && <HoursSection />}
        {tab === 'zones' && <ZonesSection />}
        {tab === 'payments' && <PaymentsSection />}
        {tab === 'messages' && <MessagesSection />}
      </div>
    </>
  );
}
