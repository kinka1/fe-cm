import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, MapPin, CheckCircle, LogOut, X, RefreshCw, ExternalLink, Loader2 } from 'lucide-react';
import { attendanceApi } from '../api/endpoints';
import { getApiError } from '../api/client';
import { Badge, Button, Field, Input, Textarea } from '../components/ui';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { useToast } from '../lib/toast';
import { useAuth } from '../lib/auth';
import { initials, mediaUrl } from '../lib/media';

/**
 * Foto absensi adalah bukti kehadiran. Kalau file-nya hilang atau gagal dimuat,
 * tampilkan status apa adanya — jangan pernah menggantinya dengan foto orang lain,
 * karena itu memalsukan bukti absensi.
 */
function AttendancePhoto({ url, employeeName, onZoom }: { url: string | null; employeeName?: string | null; onZoom: (url: string) => void }) {
  const [broken, setBroken] = useState(false);

  if (!url) return <span className="text-xs text-muted">Tanpa foto</span>;

  if (broken) {
    return <span className="inline-flex rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">Foto tidak tersedia</span>;
  }

  return (
    <button
      type="button"
      onClick={() => onZoom(url)}
      className="block h-12 w-12 overflow-hidden rounded-md border border-line bg-slate-100 transition hover:scale-105 cursor-zoom-in"
      title={`Foto check-in ${employeeName ?? 'karyawan'}`}
    >
      <img src={url} alt={`Foto check-in ${employeeName ?? 'karyawan'}`} className="h-full w-full object-cover" onError={() => setBroken(true)} />
    </button>
  );
}

/** Avatar dari potret karyawan; kalau belum ada, pakai inisial — bukan foto stok. */
function EmployeeAvatar({ url, name }: { url: string | null; name?: string | null }) {
  const [broken, setBroken] = useState(false);

  if (!url || broken) {
    return (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-100 text-xs font-bold text-teal-800" aria-hidden>
        {initials(name)}
      </span>
    );
  }

  return (
    <img
      src={url}
      alt={`Potret ${name ?? 'karyawan'}`}
      className="h-9 w-9 shrink-0 rounded-full border border-line object-cover"
      onError={() => setBroken(true)}
    />
  );
}

export function AttendancePage() {
  const { user, role } = useAuth();
  const [actionType, setActionType] = useState<'check-in' | 'check-out'>('check-in');
  const [notes, setNotes] = useState('');
  const [coordinates, setCoordinates] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [capturedPhotoBlob, setCapturedPhotoBlob] = useState<Blob | null>(null);
  const [activeLightboxUrl, setActiveLightboxUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const toast = useToast();
  const queryClient = useQueryClient();

  const logs = useQuery({ 
    queryKey: ['attendances', role !== 'admin' ? user?.employee_id : null], 
    queryFn: () => attendanceApi.list(
      role !== 'admin' && user?.employee_id 
        ? { employee_id: user.employee_id } 
        : undefined
    ) 
  });

  const fetchLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolokasi tidak didukung oleh browser Anda');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates(`${position.coords.latitude},${position.coords.longitude}`);
        setIsLocating(false);
        toast.success('Lokasi berhasil dideteksi');
      },
      (error) => {
        console.error('Error fetching geolocation', error);
        setIsLocating(false);
        toast.error('Gagal mengambil lokasi. Harap izinkan akses lokasi pada browser.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Buang hasil potret sebelumnya beserta object URL-nya.
  const clearCapturedPhoto = () => {
    if (capturedPhotoUrl) {
      URL.revokeObjectURL(capturedPhotoUrl);
    }
    setCapturedPhotoUrl(null);
    setCapturedPhotoBlob(null);
  };

  const startCamera = async () => {
    clearCapturedPhoto();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch (err) {
      console.error('Error starting camera', err);
      toast.error('Gagal mengakses kamera. Harap izinkan akses kamera di pengaturan browser Anda.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (role !== 'admin' && actionType === 'check-in') {
      startCamera();
      fetchLocation();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [actionType, role]);

  const handleCapture = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Mirror horizontal translation for user camera view
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          setCapturedPhotoBlob(blob);
          const url = URL.createObjectURL(blob);
          setCapturedPhotoUrl(url);
          stopCamera();
        }
      }, 'image/jpeg', 0.9);
    }
  };

  const handleRetake = () => {
    clearCapturedPhoto();
    startCamera();
  };

  const checkInMutation = useMutation({
    mutationFn: attendanceApi.checkIn,
    onSuccess: () => {
      toast.success('Berhasil Check-in kehadiran!');
      setNotes('');
      setCoordinates('');
      setCapturedPhotoUrl(null);
      setCapturedPhotoBlob(null);
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
    },
    onError: (error) => toast.error(getApiError(error))
  });

  const checkOutMutation = useMutation({
    mutationFn: attendanceApi.checkOut,
    onSuccess: () => {
      toast.success('Berhasil Check-out kehadiran!');
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
    },
    onError: (error) => toast.error(getApiError(error))
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.employee_id) {
      toast.error('Gagal mendeteksi ID Karyawan Anda. Pastikan data login Anda benar.');
      return;
    }

    if (actionType === 'check-in') {
      if (!coordinates) {
        toast.error('Koordinat lokasi diperlukan. Klik tombol deteksi lokasi.');
        return;
      }
      
      if (!capturedPhotoBlob) {
        toast.error('Harap ambil foto terlebih dahulu');
        return;
      }
      
      const formData = new FormData();
      formData.append('employee_id', String(user.employee_id));
      formData.append('location_coordinates', coordinates);
      if (notes) formData.append('notes', notes);
      formData.append('photo', capturedPhotoBlob, 'attendance.jpg');

      checkInMutation.mutate(formData);
    } else {
      checkOutMutation.mutate({
        employee_id: Number(user.employee_id),
        notes: notes || null
      });
    }
  };

  return (
    <section className={`grid gap-5 ${role === 'admin' ? 'grid-cols-1' : 'xl:grid-cols-[360px_1fr]'}`}>
      {role !== 'admin' && (
        <aside className="rounded-md border border-line bg-card p-4 shadow-card h-fit">
          <h2 className="text-xl font-bold text-ink">Absensi Karyawan</h2>
          <p className="text-xs text-muted mb-4">Lakukan Check-In dan Check-Out kehadiran Anda hari ini.</p>

          <div className="mb-4 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              className={`flex items-center justify-center gap-2 rounded-md py-1.5 text-sm font-semibold transition ${actionType === 'check-in' ? 'bg-card text-ink shadow-card' : 'text-muted hover:text-ink'}`}
              onClick={() => setActionType('check-in')}
            >
              <CheckCircle className="h-4 w-4 text-emerald-600" /> Check In
            </button>
            <button
              type="button"
              className={`flex items-center justify-center gap-2 rounded-md py-1.5 text-sm font-semibold transition ${actionType === 'check-out' ? 'bg-card text-ink shadow-card' : 'text-muted hover:text-ink'}`}
              onClick={() => setActionType('check-out')}
            >
              <LogOut className="h-4 w-4 text-red-600" /> Check Out
            </button>
          </div>

          <form onSubmit={submit} className="grid gap-4">
            <div className="rounded-md border border-line bg-subtle p-3 text-sm">
              <span className="text-xs text-muted block font-semibold uppercase">Nama Karyawan</span>
              <span className="text-base font-bold text-ink mt-0.5 block">{user?.name || 'Operator'}</span>
              <span className="text-xs text-muted">Employee ID: {user?.employee_id ?? 'belum diset'}</span>
            </div>

            {actionType === 'check-in' && (
              <>
                <div className="grid gap-2 border border-line rounded-md p-3 bg-subtle">
                  <span className="text-xs font-bold text-slate-700 block">Ambil Foto Wajah</span>

                  <div className="relative aspect-video w-full overflow-hidden rounded-md border border-line bg-black flex items-center justify-center">
                    {isCameraActive && !capturedPhotoUrl && (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="h-full w-full object-cover scale-x-[-1]"
                      />
                    )}

                    {capturedPhotoUrl && (
                      <img
                        src={capturedPhotoUrl}
                        alt="Preview absensi"
                        className="h-full w-full object-cover"
                      />
                    )}

                    {!isCameraActive && !capturedPhotoUrl && (
                      <div className="text-center p-4">
                        <Camera className="mx-auto h-8 w-8 text-slate-600 animate-pulse" />
                        <p className="text-xs text-slate-500 mt-2">Kamera dimatikan</p>
                        <Button type="button" variant="secondary" className="mt-3 h-8 min-h-8 text-xs" onClick={startCamera}>
                          Aktifkan Kamera
                        </Button>
                      </div>
                    )}

                    {isCameraActive && !capturedPhotoUrl && (
                      <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                        <Button
                          type="button"
                          onClick={handleCapture}
                          className="h-9 min-h-9 px-4 bg-brand text-white shadow-md hover:bg-teal-800"
                        >
                          <Camera className="h-4 w-4" /> Potret
                        </Button>
                      </div>
                    )}

                    {capturedPhotoUrl && (
                      <button
                        type="button"
                        onClick={handleRetake}
                        className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black transition"
                        title="Foto Ulang"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid gap-2 border border-line rounded-md p-3 bg-subtle">
                  <span className="text-xs font-bold text-slate-700 block">Koordinat Geolokasi</span>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-muted">
                        <MapPin className="h-4 w-4 text-brand" />
                      </span>
                      <Input
                        placeholder="Latitude, Longitude"
                        value={coordinates}
                        onChange={(e) => setCoordinates(e.target.value)}
                        className="pl-8 h-9 min-h-9 text-xs"
                        required
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={fetchLocation}
                      disabled={isLocating}
                      className="h-9 min-h-9 px-3 flex items-center justify-center"
                      title="Deteksi Lokasi"
                    >
                      {isLocating ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <MapPin className="h-4 w-4 text-slate-700" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}

            <Field label="Catatan (Opsional)">
              <Textarea
                placeholder="Masukkan alasan terlambat, catatan perjalanan, atau status dinas luar..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-16 text-sm"
              />
            </Field>

            <Button
              type="submit"
              disabled={checkInMutation.isPending || checkOutMutation.isPending}
              className="w-full mt-2"
            >
              {(checkInMutation.isPending || checkOutMutation.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {actionType === 'check-in' ? 'Kirim Check-In Kehadiran' : 'Kirim Check-Out Kehadiran'}
            </Button>
          </form>
        </aside>
      )}

      <div className="rounded-md border border-line bg-card p-4 shadow-card min-w-0">
        <h2 className="text-xl font-bold text-ink">
          {role === 'admin' ? 'Monitoring Absensi Karyawan (Admin)' : 'Riwayat Absensi'}
        </h2>
        <p className="text-xs text-muted mb-4">
          {role === 'admin' 
            ? 'Mengecek log jam clock-in, clock-out, geolokasi (maps), dan foto selfie kehadiran seluruh karyawan kafe.' 
            : 'Catatan clock-in, clock-out, foto selfie, dan maps lokasi kehadiran Anda.'}
        </p>

        {logs.isLoading && <LoadingState />}
        {logs.error && <ErrorState message={getApiError(logs.error)} />}
        {!logs.isLoading && !logs.error && logs.data?.length === 0 && (
          <EmptyState title="Absensi Kosong" description="Belum ada catatan kehadiran yang terekam." />
        )}

        {!logs.isLoading && logs.data && logs.data.length > 0 && (
          <div className="overflow-x-auto rounded-md border border-line">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-subtle text-xs uppercase text-muted font-semibold border-b border-line">
                <tr>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Karyawan</th>
                  <th className="px-4 py-3">Check-in</th>
                  <th className="px-4 py-3">Check-out</th>
                  <th className="px-4 py-3">Foto</th>
                  <th className="px-4 py-3">Lokasi</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {logs.data.map((log) => (
                  <tr key={log.id} className="border-t border-line hover:bg-subtle/40 transition">
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{log.date}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <EmployeeAvatar
                          url={mediaUrl(log.employee?.photo_url) ?? mediaUrl(log.photo_url)}
                          name={log.employee?.full_name}
                        />
                        <div>
                          <p className="font-semibold text-ink">{log.employee?.full_name ?? `Karyawan #${log.employee_id}`}</p>
                          <p className="text-xs text-muted">{log.employee?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-700 whitespace-nowrap">
                      {log.clock_in ? log.clock_in.substring(0, 5) : '-'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-red-600 whitespace-nowrap">
                      {log.clock_out ? log.clock_out.substring(0, 5) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <AttendancePhoto
                        url={mediaUrl(log.photo_url)}
                        employeeName={log.employee?.full_name}
                        onZoom={setActiveLightboxUrl}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {log.location_coordinates ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${log.location_coordinates}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-brand font-semibold hover:underline"
                        >
                          <MapPin className="h-3 w-3" /> Maps <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={log.status === 'hadir' ? 'green' : log.status === 'izin' ? 'blue' : log.status === 'sakit' ? 'amber' : 'red'}>
                        {log.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted max-w-[150px] truncate" title={log.notes || ''}>
                      {log.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {activeLightboxUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm transition-all duration-300">
          <div className="relative max-w-2xl max-h-[85vh] overflow-hidden rounded-md border border-white/10 bg-black p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setActiveLightboxUrl(null)}
              className="absolute top-3 right-3 rounded-full bg-black/60 p-2 text-white hover:bg-black transition z-10"
              aria-label="Tutup"
            >
              <X className="h-5 w-5" />
            </button>
            <img src={activeLightboxUrl} alt="Foto absensi lengkap" className="max-w-full max-h-[80vh] object-contain block mx-auto" />
          </div>
        </div>
      )}
    </section>
  );
}
