import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { Badge } from './ui/badge';

export default function Status() {
  const currentStatus = {
    overall: 'operational',
    uptime: 99.98,
    lastUpdated: new Date().toISOString(),
  };

  const services = [
    {
      name: 'API Services',
      status: 'operational',
      description: 'Core subscription tracking API',
    },
    {
      name: 'Authentication',
      status: 'operational',
      description: 'User sign-in and sign-up services',
    },
    {
      name: 'Data Storage',
      status: 'operational',
      description: 'Subscription data persistence',
    },
    {
      name: 'Notification System',
      status: 'operational',
      description: 'Email and push notification delivery',
    },
  ];

  const incidents = [
    {
      id: '1',
      date: '2026-03-01',
      title: 'Scheduled Maintenance',
      description: 'Database optimization and performance improvements completed successfully',
      status: 'resolved',
      impact: 'none',
    },
    {
      id: '2',
      date: '2026-02-15',
      title: 'API Latency',
      description: 'Brief increase in API response times. Issue identified and resolved.',
      status: 'resolved',
      impact: 'minor',
    },
  ];

  const upcomingMaintenance = [
    {
      id: '1',
      date: '2026-03-15',
      title: 'Infrastructure Upgrade',
      description: 'Upgrading server infrastructure for improved performance',
      duration: '2 hours',
      impact: 'minimal',
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'outage':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'operational':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Operational</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Degraded</Badge>;
      case 'outage':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Outage</Badge>;
      case 'resolved':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Resolved</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">System Status</h1>
        <p className="text-muted-foreground">
          Current status and uptime of all services
        </p>
      </div>

      {/* Overall Status */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {getStatusIcon(currentStatus.overall)}
              <div>
                <h2 className="text-xl font-semibold">All Systems Operational</h2>
                <p className="text-sm text-muted-foreground">
                  Last updated: {new Date(currentStatus.lastUpdated).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold">{currentStatus.uptime}%</div>
              <p className="text-sm text-muted-foreground">Uptime (30 days)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Service Status</CardTitle>
          <CardDescription>
            Individual component health and availability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {services.map((service) => (
              <div key={service.name} className="flex items-center justify-between py-3 border-b last:border-0">
                <div className="flex items-center gap-3">
                  {getStatusIcon(service.status)}
                  <div>
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm text-muted-foreground">{service.description}</p>
                  </div>
                </div>
                {getStatusBadge(service.status)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Incidents */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Recent Incidents</CardTitle>
          <CardDescription>
            Past issues and their resolutions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {incidents.map((incident) => (
              <div key={incident.id} className="p-4 rounded-lg border">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium">{incident.title}</h3>
                  {getStatusBadge(incident.status)}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{incident.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{new Date(incident.date).toLocaleDateString()}</span>
                  <span className="capitalize">Impact: {incident.impact}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Maintenance */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Maintenance</CardTitle>
          <CardDescription>
            Planned maintenance windows and upgrades
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingMaintenance.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No scheduled maintenance at this time
            </p>
          ) : (
            <div className="space-y-4">
              {upcomingMaintenance.map((maintenance) => (
                <div key={maintenance.id} className="p-4 rounded-lg border bg-muted/50">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium">{maintenance.title}</h3>
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{maintenance.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Date: {new Date(maintenance.date).toLocaleDateString()}</span>
                    <span>Duration: {maintenance.duration}</span>
                    <span className="capitalize">Impact: {maintenance.impact}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscribe to Updates */}
      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          For real-time status updates and notifications, check back regularly or enable notifications in your settings.
        </p>
      </div>
    </div>
  );
}
