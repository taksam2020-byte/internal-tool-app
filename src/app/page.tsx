'use client';

import { Card, Col, Row } from 'react-bootstrap';
import Link from 'next/link';
import { useSettings } from '@/context/SettingsContext';
import { PersonPlus, Building, Lightbulb, GearFill } from 'react-bootstrap-icons';

import Image from 'next/image';

export default function HomePage() {
  const { settings, isSettingsLoaded } = useSettings();

  const menuItems = [
    {
      href: '/customers',
      title: '得意先登録',
      description: '新しい得意先の登録や既存情報の変更申請を行います。',
      icon: <PersonPlus size={40} />,
      bg: 'primary',
      show: true
    },
    {
      href: '/reservations',
      title: '本社施設予約',
      description: '本社施設の利用予約を申請します。',
      icon: <Building size={40} />,
      bg: 'success',
      show: true
    },
    {
      href: '/proposals',
      title: '催事提案',
      description: '新しい催事のアイデアを提案します。',
      icon: <Lightbulb size={40} />,
      style: { backgroundColor: '#ff8c00', color: '#ffffff' },
      show: settings.isProposalOpen
    },
    {
      href: '/admin',
      title: '管理画面',
      description: 'アプリケーション全体の設定を管理します。',
      icon: <GearFill size={40} />,
      bg: 'secondary',
      show: true
    },
  ];

  if (!isSettingsLoaded) {
    return <div>読み込み中...</div>;
  }

  return (
    <div>
      <h1 className="mb-4 d-flex align-items-center">
        <Image src="/logo.png" alt="Logo" width={50} height={50} className="me-3" />
        <span>社内ツール</span>
      </h1>
      <Row xs={1} md={2} className="g-4">
        {menuItems.filter(item => item.show).map((item, idx) => (
          <Col key={idx}>
            <Link href={item.href} passHref legacyBehavior>
              <Card as="a" {...(item.bg && {bg: item.bg})} text="white" className="h-100 text-decoration-none" style={item.style}>
                <Card.Body className="d-flex align-items-center">
                  <div className="me-3">{item.icon}</div>
                  <div>
                    <Card.Title as="h5">{item.title}</Card.Title>
                    <Card.Text>{item.description}</Card.Text>
                  </div>
                </Card.Body>
              </Card>
            </Link>
          </Col>
        ))}
      </Row>
    </div>
  );
}