import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/audio/sensory_service.dart';
import '../../state/game_session_provider.dart';

/// Social Friends modal supporting `@handle`, `UID`, and `HLH-` code lookup,
/// live online/match presence, friend requests, and private room invites.
class FriendsModal extends ConsumerStatefulWidget {
  final int initialTab;

  const FriendsModal({
    super.key,
    this.initialTab = 0,
  });

  static Future<void> show(
    BuildContext context, {
    int initialTab = 0,
  }) {
    return showDialog(
      context: context,
      barrierDismissible: true,
      builder: (_) => FriendsModal(initialTab: initialTab),
    );
  }

  @override
  ConsumerState<FriendsModal> createState() => _FriendsModalState();
}

class _FriendsModalState extends ConsumerState<FriendsModal> {
  late int _activeTab;
  final TextEditingController _lookupController = TextEditingController();
  final TextEditingController _handleController = TextEditingController();

  bool _editingHandle = false;
  bool _savingHandle = false;
  bool _searching = false;
  bool _lookupAttempted = false;
  PlayerLookupResult? _lookupResult;
  String? _statusMessage;
  bool _statusIsError = false;
  final Set<String> _invitedFriendIds = {};

  @override
  void initState() {
    super.initState();
    _activeTab = widget.initialTab.clamp(0, 2);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final session = ref.read(gameSessionProvider);
      _handleController.text = session.username ?? '';
      if (session.isCloudSynced) {
        ref.read(gameSessionProvider.notifier).refreshFriendsAndRequests();
      }
    });
  }

  @override
  void dispose() {
    _lookupController.dispose();
    _handleController.dispose();
    super.dispose();
  }

  void _setStatus(String msg, {bool isError = false}) {
    if (!mounted) return;
    setState(() {
      _statusMessage = msg;
      _statusIsError = isError;
    });
  }

  Future<void> _saveHandle() async {
    final raw = _handleController.text.trim();
    if (raw.isEmpty) return;
    setState(() {
      _savingHandle = true;
      _statusMessage = null;
    });
    try {
      final saved = await ref.read(gameSessionProvider.notifier).updateHandle(raw);
      if (!mounted) return;
      setState(() {
        _savingHandle = false;
        _editingHandle = false;
        _handleController.text = saved;
      });
      _setStatus('Handle updated: @$saved');
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _savingHandle = false;
      });
      _setStatus(e.toString(), isError: true);
    }
  }

  Future<void> _runLookup() async {
    final query = _lookupController.text.trim();
    if (query.isEmpty) return;
    setState(() {
      _searching = true;
      _lookupAttempted = true;
      _lookupResult = null;
      _statusMessage = null;
    });
    try {
      final result = await ref
          .read(gameSessionProvider.notifier)
          .lookupFriendCandidate(query);
      if (!mounted) return;
      setState(() {
        _searching = false;
        _lookupResult = result;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _searching = false;
      });
      _setStatus(e.toString(), isError: true);
    }
  }

  Future<void> _sendRequest(String identifier) async {
    try {
      await ref.read(gameSessionProvider.notifier).sendFriendRequest(identifier);
      if (!mounted) return;
      if (_lookupResult != null) {
        setState(() {
          _lookupResult = PlayerLookupResult(
            id: _lookupResult!.id,
            displayName: _lookupResult!.displayName,
            username: _lookupResult!.username,
            avatarId: _lookupResult!.avatarId,
            level: _lookupResult!.level,
            friendCode: _lookupResult!.friendCode,
            presenceStatus: _lookupResult!.presenceStatus,
            relationStatus: 'PENDING',
          );
        });
      }
      _setStatus('Friend request sent');
    } catch (e) {
      _setStatus(e.toString(), isError: true);
    }
  }

  void _copyValue(String label, String value) {
    SensoryService.instance.playButtonTap();
    Clipboard.setData(ClipboardData(text: value));
    _setStatus('Copied $label');
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(gameSessionProvider);
    final notifier = ref.read(gameSessionProvider.notifier);

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      child: Container(
        key: const Key('friends_modal'),
        constraints: const BoxConstraints(maxWidth: 620, maxHeight: 440),
        decoration: BoxDecoration(
          color: const Color(0xFA140506),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: const Color(0xFFD4AF37), width: 1.6),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.9),
              blurRadius: 34,
              spreadRadius: 4,
            ),
          ],
        ),
        child: Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
              decoration: const BoxDecoration(
                border: Border(
                  bottom: BorderSide(color: Color(0xFF380C10), width: 1.2),
                ),
                gradient: LinearGradient(
                  colors: [Color(0xFF260A0D), Color(0xFF140506)],
                ),
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(20),
                  topRight: Radius.circular(20),
                ),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.people_alt_rounded,
                    color: Color(0xFFD4AF37),
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'FRIENDS',
                    style: TextStyle(
                      color: Color(0xFFF7F0EA),
                      fontSize: 14,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.1,
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    '• ރައްޓެހިން',
                    textDirection: TextDirection.rtl,
                    style: TextStyle(
                      color: Color(0xFFD4AF37),
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const Spacer(),
                  if (session.isCloudSynced)
                    IconButton(
                      icon: const Icon(
                        Icons.refresh,
                        color: Color(0xFFE5C378),
                        size: 18,
                      ),
                      tooltip: 'Refresh',
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                      onPressed: () {
                        SensoryService.instance.playButtonTap();
                        notifier.refreshFriendsAndRequests();
                      },
                    ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white70, size: 19),
                    tooltip: 'Close',
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),

            if (!session.isCloudSynced)
              Expanded(child: _buildGuestGate(session, notifier))
            else
              Expanded(
                child: Column(
                  children: [
                    // Own Identity Strip (@handle + UID + Code)
                    _buildIdentityStrip(session),

                    // Tabs Row
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 6, 16, 6),
                      child: Row(
                        children: [
                          _buildTabChip(
                            key: const Key('tab_friends'),
                            label: 'Friends (${session.friends.length})',
                            selected: _activeTab == 0,
                            onTap: () => setState(() => _activeTab = 0),
                          ),
                          const SizedBox(width: 8),
                          _buildTabChip(
                            key: const Key('tab_add_friend'),
                            label: 'Add Friend',
                            selected: _activeTab == 1,
                            onTap: () => setState(() => _activeTab = 1),
                          ),
                          const SizedBox(width: 8),
                          _buildTabChip(
                            key: const Key('tab_requests'),
                            label: 'Requests (${session.pendingFriendRequestCount})',
                            selected: _activeTab == 2,
                            highlightBadge: session.incomingFriendRequests.isNotEmpty,
                            onTap: () => setState(() => _activeTab = 2),
                          ),
                        ],
                      ),
                    ),

                    // Inline status / error message
                    if (_statusMessage != null || session.friendsError != null)
                      Container(
                        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: (_statusIsError || session.friendsError != null)
                              ? const Color(0x33C84B31)
                              : const Color(0x262E7D32),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: (_statusIsError || session.friendsError != null)
                                ? const Color(0xFFC84B31)
                                : const Color(0xFF81C784),
                          ),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                _statusMessage ?? session.friendsError ?? '',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  color: (_statusIsError || session.friendsError != null)
                                      ? const Color(0xFFFFA07A)
                                      : const Color(0xFF81C784),
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                            InkWell(
                              onTap: () => setState(() => _statusMessage = null),
                              child: const Icon(
                                Icons.close,
                                size: 13,
                                color: Color(0xAAF7F0EA),
                              ),
                            ),
                          ],
                        ),
                      ),

                    // Active Tab Body
                    Expanded(
                      child: switch (_activeTab) {
                        0 => _buildFriendsTab(session, notifier),
                        1 => _buildAddFriendTab(),
                        _ => _buildRequestsTab(session, notifier),
                      },
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildGuestGate(
    GameSessionState session,
    GameSessionNotifier notifier,
  ) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.lock_outline_rounded,
              color: Color(0xFFD4AF37),
              size: 36,
            ),
            const SizedBox(height: 10),
            const Text(
              'Sign in with Google',
              style: TextStyle(
                color: Color(0xFFF7F0EA),
                fontSize: 15,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 14),
            ElevatedButton.icon(
              key: const Key('btn_friends_google_signin'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: const Color(0xFF1F1F1F),
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              icon: const Icon(Icons.g_mobiledata, size: 22, color: Color(0xFF4285F4)),
              label: session.authBusy
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text(
                      'Sign In with Google',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
                    ),
              onPressed: session.authBusy
                  ? null
                  : () {
                      SensoryService.instance.playButtonTap();
                      notifier.signInWithGoogle();
                    },
            ),
            if (session.authErrorMessage != null) ...[
              const SizedBox(height: 8),
              Text(
                session.authErrorMessage!,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: Color(0xFFFFA07A), fontSize: 10.5),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildIdentityStrip(GameSessionState session) {
    final handleLabel = (session.username != null && session.username!.isNotEmpty)
        ? '@${session.username}'
        : 'Set @handle';
    final shortUid = session.effectiveProfileId.length > 10
        ? session.effectiveProfileId.substring(0, 10)
        : session.effectiveProfileId;

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 10, 16, 4),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: const Color(0xFF0D0405),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF380C10)),
      ),
      child: _editingHandle
          ? Row(
              children: [
                const Text(
                  '@',
                  style: TextStyle(
                    color: Color(0xFFD4AF37),
                    fontWeight: FontWeight.w900,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(width: 4),
                Expanded(
                  child: TextField(
                    key: const Key('input_edit_handle'),
                    controller: _handleController,
                    autofocus: true,
                    style: const TextStyle(
                      color: Color(0xFFF7F0EA),
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                    decoration: const InputDecoration(
                      isDense: true,
                      hintText: 'username_3to20',
                      hintStyle: TextStyle(color: Color(0x66F7F0EA), fontSize: 11),
                      border: InputBorder.none,
                    ),
                    onSubmitted: (_) => _saveHandle(),
                  ),
                ),
                TextButton(
                  onPressed: _savingHandle
                      ? null
                      : () => setState(() => _editingHandle = false),
                  child: const Text(
                    'Cancel',
                    style: TextStyle(color: Color(0x99F7F0EA), fontSize: 11),
                  ),
                ),
                ElevatedButton(
                  key: const Key('btn_save_handle'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFD4AF37),
                    foregroundColor: const Color(0xFF0D0605),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    minimumSize: Size.zero,
                  ),
                  onPressed: _savingHandle ? null : _saveHandle,
                  child: Text(
                    _savingHandle ? '...' : 'Save',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900),
                  ),
                ),
              ],
            )
          : Wrap(
              spacing: 8,
              runSpacing: 6,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                InkWell(
                  key: const Key('pill_my_handle'),
                  onTap: () => setState(() {
                    _handleController.text = session.username ?? '';
                    _editingHandle = true;
                  }),
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF260A0D),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFD4AF37), width: 1.0),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          handleLabel,
                          style: const TextStyle(
                            color: Color(0xFFE5C378),
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            fontFamily: 'monospace',
                          ),
                        ),
                        const SizedBox(width: 5),
                        const Icon(Icons.edit, size: 12, color: Color(0xFFD4AF37)),
                      ],
                    ),
                  ),
                ),
                InkWell(
                  key: const Key('chip_my_uid'),
                  onTap: () => _copyValue('UID', session.effectiveProfileId),
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF19080A),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFF380C10)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'UID: $shortUid',
                          style: const TextStyle(
                            color: Color(0xBBF7F0EA),
                            fontSize: 10,
                            fontFamily: 'monospace',
                          ),
                        ),
                        const SizedBox(width: 4),
                        const Icon(Icons.copy, size: 11, color: Color(0x99F7F0EA)),
                      ],
                    ),
                  ),
                ),
                if (session.friendCode != null && session.friendCode!.isNotEmpty)
                  InkWell(
                    key: const Key('chip_my_code'),
                    onTap: () => _copyValue('Code', session.friendCode!),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFF19080A),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFF380C10)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            session.friendCode!,
                            style: const TextStyle(
                              color: Color(0xFFE5C378),
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              fontFamily: 'monospace',
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Icon(Icons.copy, size: 11, color: Color(0x99F7F0EA)),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
    );
  }

  Widget _buildTabChip({
    required Key key,
    required String label,
    required bool selected,
    bool highlightBadge = false,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: InkWell(
        key: key,
        onTap: () {
          SensoryService.instance.playButtonTap();
          onTap();
        },
        borderRadius: BorderRadius.circular(10),
        child: Container(
          height: 32,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: selected ? const Color(0xFFD4AF37) : const Color(0xFF1B0709),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: selected
                  ? const Color(0xFFE5C378)
                  : highlightBadge
                      ? const Color(0xFFC84B31)
                      : const Color(0xFF380C10),
            ),
          ),
          child: Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: selected ? const Color(0xFF0D0605) : const Color(0xFFF7F0EA),
              fontSize: 11,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFriendsTab(
    GameSessionState session,
    GameSessionNotifier notifier,
  ) {
    if (session.friendsLoading && session.friends.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(color: Color(0xFFD4AF37)),
      );
    }

    if (session.friends.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'No friends yet',
              style: TextStyle(
                color: Color(0x99F7F0EA),
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 10),
            OutlinedButton(
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Color(0xFFD4AF37)),
                foregroundColor: const Color(0xFFE5C378),
              ),
              onPressed: () => setState(() => _activeTab = 1),
              child: const Text('Add Friend', style: TextStyle(fontSize: 11.5)),
            ),
          ],
        ),
      );
    }

    final canInviteToRoom =
        session.screenState == AppScreenState.waitingRoom && session.isPrivateRoom;

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 6, 16, 14),
      itemCount: session.friends.length,
      separatorBuilder: (_, __) => const SizedBox(height: 6),
      itemBuilder: (context, index) {
        final f = session.friends[index];
        final statusText = switch (f.presenceStatus) {
          'IN_MATCH' => 'In Match',
          'IN_QUEUE' => 'In Queue',
          'IN_ROOM' => 'In Room',
          'IN_LOBBY' => 'Online',
          _ => 'Offline',
        };
        final statusColor = switch (f.presenceStatus) {
          'IN_MATCH' || 'IN_QUEUE' => const Color(0xFFE5C378),
          'IN_LOBBY' || 'IN_ROOM' => const Color(0xFF00E676),
          _ => const Color(0x66F7F0EA),
        };
        final invited = _invitedFriendIds.contains(f.friendId);

        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: const Color(0xFF1A0709),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF380C10)),
          ),
          child: Row(
            children: [
              Stack(
                children: [
                  CircleAvatar(
                    radius: 16,
                    backgroundColor: const Color(0xFF380C10),
                    child: Text(
                      f.displayName.isNotEmpty
                          ? f.displayName.substring(0, 1).toUpperCase()
                          : 'P',
                      style: const TextStyle(
                        color: Color(0xFFE5C378),
                        fontSize: 13,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  Positioned(
                    right: 0,
                    bottom: 0,
                    child: Container(
                      width: 9,
                      height: 9,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: statusColor,
                        border: Border.all(color: const Color(0xFF1A0709), width: 1.5),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      f.displayName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Color(0xFFF7F0EA),
                        fontSize: 12.5,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    Text(
                      '${f.handleLabel} • $statusText',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: statusColor,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ],
                ),
              ),
              if (canInviteToRoom)
                Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: invited
                          ? const Color(0xFF2E7D32)
                          : const Color(0xFFD4AF37),
                      foregroundColor:
                          invited ? Colors.white : const Color(0xFF0D0605),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 5,
                      ),
                      minimumSize: Size.zero,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    onPressed: invited
                        ? null
                        : () {
                            SensoryService.instance.playButtonTap();
                            notifier.inviteFriendToRoom(f.friendId);
                            setState(() => _invitedFriendIds.add(f.friendId));
                          },
                    child: Text(
                      invited ? 'Invited' : 'Invite',
                      style: const TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ),
              IconButton(
                icon: const Icon(
                  Icons.person_remove_outlined,
                  size: 17,
                  color: Color(0x88FF8A80),
                ),
                tooltip: 'Remove',
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 30, minHeight: 30),
                onPressed: () {
                  SensoryService.instance.playButtonTap();
                  notifier.removeFriend(f.friendId);
                },
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildAddFriendTab() {
    final candidate = _lookupResult;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: TextField(
                  key: const Key('input_friend_lookup'),
                  controller: _lookupController,
                  style: const TextStyle(
                    color: Color(0xFFF7F0EA),
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                  ),
                  decoration: InputDecoration(
                    hintText: '@handle, UID, or HLH-code',
                    hintStyle: const TextStyle(
                      color: Color(0x66F7F0EA),
                      fontSize: 12,
                    ),
                    filled: true,
                    fillColor: const Color(0xFF0D0405),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFF380C10)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFF380C10)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFFD4AF37)),
                    ),
                  ),
                  onSubmitted: (_) => _runLookup(),
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                key: const Key('btn_friend_lookup'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFD4AF37),
                  foregroundColor: const Color(0xFF0D0605),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                onPressed: _searching ? null : _runLookup,
                child: _searching
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Color(0xFF0D0605),
                        ),
                      )
                    : const Text(
                        'Search',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (candidate != null)
            Container(
              key: const Key('lookup_result_card'),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFF1E090C),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFD4AF37), width: 1.2),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 18,
                    backgroundColor: const Color(0xFF380C10),
                    child: Text(
                      candidate.displayName.isNotEmpty
                          ? candidate.displayName.substring(0, 1).toUpperCase()
                          : 'P',
                      style: const TextStyle(
                        color: Color(0xFFE5C378),
                        fontSize: 14,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          candidate.displayName,
                          style: const TextStyle(
                            color: Color(0xFFF7F0EA),
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        Text(
                          [
                            if (candidate.username.isNotEmpty)
                              '@${candidate.username}',
                            if (candidate.friendCode.isNotEmpty)
                              candidate.friendCode,
                            'Lvl ${candidate.level}',
                          ].join(' • '),
                          style: const TextStyle(
                            color: Color(0xFFE5C378),
                            fontSize: 10.5,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (candidate.relationStatus == 'ACCEPTED')
                    const Chip(
                      label: Text('Friends ✓', style: TextStyle(fontSize: 10)),
                      backgroundColor: Color(0xFF1B5E20),
                    )
                  else if (candidate.relationStatus == 'PENDING')
                    const Chip(
                      label: Text('Pending', style: TextStyle(fontSize: 10)),
                      backgroundColor: Color(0xFF380C10),
                    )
                  else if (candidate.relationStatus == 'SELF')
                    const Chip(
                      label: Text('You', style: TextStyle(fontSize: 10)),
                      backgroundColor: Color(0xFF380C10),
                    )
                  else
                    ElevatedButton(
                      key: const Key('btn_send_friend_request'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFD4AF37),
                        foregroundColor: const Color(0xFF0D0605),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 8,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      onPressed: () {
                        SensoryService.instance.playButtonTap();
                        _sendRequest(candidate.id);
                      },
                      child: const Text(
                        'Send Request',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                ],
              ),
            )
          else if (_lookupAttempted && !_searching)
            const Padding(
              padding: EdgeInsets.only(top: 12),
              child: Center(
                child: Text(
                  'Player not found',
                  style: TextStyle(color: Color(0x99F7F0EA), fontSize: 12),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildRequestsTab(
    GameSessionState session,
    GameSessionNotifier notifier,
  ) {
    final incoming = session.incomingFriendRequests;
    final outgoing = session.outgoingFriendRequests;

    if (incoming.isEmpty && outgoing.isEmpty) {
      return const Center(
        child: Text(
          'No pending requests',
          style: TextStyle(
            color: Color(0x99F7F0EA),
            fontSize: 12.5,
            fontWeight: FontWeight.w700,
          ),
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 6, 16, 14),
      children: [
        if (incoming.isNotEmpty) ...[
          const Text(
            'INCOMING',
            style: TextStyle(
              color: Color(0xFFD4AF37),
              fontSize: 10,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.0,
            ),
          ),
          const SizedBox(height: 6),
          for (final r in incoming)
            Container(
              margin: const EdgeInsets.only(bottom: 6),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF1A0709),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF380C10)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          r.displayName,
                          style: const TextStyle(
                            color: Color(0xFFF7F0EA),
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        Text(
                          r.username.isNotEmpty ? '@${r.username}' : r.friendCode,
                          style: const TextStyle(
                            color: Color(0xFFE5C378),
                            fontSize: 10,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),
                  ),
                  TextButton(
                    style: TextButton.styleFrom(
                      foregroundColor: const Color(0xFFFFA07A),
                      minimumSize: Size.zero,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 5,
                      ),
                    ),
                    onPressed: () => notifier.respondToFriendRequest(
                      requestId: r.requestId,
                      accept: false,
                    ),
                    child: const Text('Decline', style: TextStyle(fontSize: 11)),
                  ),
                  const SizedBox(width: 4),
                  ElevatedButton(
                    key: Key('btn_accept_req_${r.requestId}'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFD4AF37),
                      foregroundColor: const Color(0xFF0D0605),
                      minimumSize: Size.zero,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                    ),
                    onPressed: () => notifier.respondToFriendRequest(
                      requestId: r.requestId,
                      accept: true,
                    ),
                    child: const Text(
                      'Accept',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900),
                    ),
                  ),
                ],
              ),
            ),
        ],
        if (outgoing.isNotEmpty) ...[
          const SizedBox(height: 6),
          const Text(
            'SENT',
            style: TextStyle(
              color: Color(0x99F7F0EA),
              fontSize: 10,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.0,
            ),
          ),
          const SizedBox(height: 6),
          for (final r in outgoing)
            Container(
              margin: const EdgeInsets.only(bottom: 6),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF140506),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF380C10)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          r.displayName,
                          style: const TextStyle(
                            color: Color(0xFFF7F0EA),
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        Text(
                          r.username.isNotEmpty ? '@${r.username}' : r.friendCode,
                          style: const TextStyle(
                            color: Color(0x99F7F0EA),
                            fontSize: 10,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),
                  ),
                  OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFF380C10)),
                      foregroundColor: const Color(0xFFFFA07A),
                      minimumSize: Size.zero,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 5,
                      ),
                    ),
                    onPressed: () => notifier.cancelFriendRequest(r.requestId),
                    child: const Text('Cancel', style: TextStyle(fontSize: 11)),
                  ),
                ],
              ),
            ),
        ],
      ],
    );
  }
}
