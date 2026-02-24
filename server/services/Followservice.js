export const followService = {
  async follow(followerId, followingId) {
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: followerId, following_id: followingId });
    if (error && error.code !== '23505') throw error;
  },

  async unfollow(followerId, followingId) {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);
    if (error) throw error;
  },

  async isFollowing(followerId, followingId) {
    const { data, error } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();
    if (error) throw error;
    return data !== null;
  },

  async getFollowing(userId) {
    const { data, error } = await supabase
      .from('follows')
      .select(`following:profiles!following_id ( id, username, display_name, avatar_url ), created_at`)
      .eq('follower_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map((r) => r.following);
  },

  async getFollowers(userId) {
    const { data, error } = await supabase
      .from('follows')
      .select(`follower:profiles!follower_id ( id, username, display_name, avatar_url ), created_at`)
      .eq('following_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map((r) => r.follower);
  },

  async getCounts(userId) {
    const [followersRes, followingRes] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
    ]);
    if (followersRes.error) throw followersRes.error;
    if (followingRes.error) throw followingRes.error;
    return {
      followerCount: followersRes.count ?? 0,
      followingCount: followingRes.count ?? 0,
    };
  },
};